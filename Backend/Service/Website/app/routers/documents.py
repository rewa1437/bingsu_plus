"""
Document/Knowledge routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Response, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import exists, or_, and_, and_
from typing import List, Optional, Dict, Any
import os
import json
from pathlib import Path

from app.database import get_db
from app.models import Document, DocumentShare, User, DocumentShareRoleEnum
from app.schemas.document import (
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentShareRequest,
    DocumentShareDeleteRequest, DocumentShareResponse
)
from app.schemas.user import UserSummary
from app.dependencies import get_current_user
from app.services.qdrant_client import delete_document_vectors, index_document_chunks, check_qdrant_connection, ensure_collection
from app.services.embeddings_service import embed_texts

router = APIRouter(prefix="/documents", tags=["documents"])

HELP_DOC_DISPLAY_NAME = "คู่มือการใช้งาน"
MAX_TAGS = 20
MAX_TAG_LENGTH = 32
LOCAL_FILES_ROOT = Path(os.getenv("LOCAL_FILES_ROOT", ".files"))


def normalize_tags(tags: Optional[List[str]]) -> List[str]:
    """Normalize and validate tags"""
    if not tags:
        return []
    normalized = [
        tag.strip()[:MAX_TAG_LENGTH]
        for tag in tags
        if isinstance(tag, str) and tag.strip()
    ]
    seen = set()
    deduped = []
    for tag in normalized:
        key = tag.lower()
        if key not in seen:
            seen.add(key)
            deduped.append(tag)
            if len(deduped) >= MAX_TAGS:
                break
    return deduped


def strip_source_files(source_files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove text and blocks from source files for summary response"""
    if not isinstance(source_files, list):
        return source_files
    return [
        {k: v for k, v in file.items() if k not in ["text", "blocks"]}
        if isinstance(file, dict) else file
        for file in source_files
    ]


@router.get("", response_model=List[DocumentResponse])
async def get_documents(
    summary: Optional[bool] = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all documents accessible by current user"""
    documents = (
        db.query(Document)
        .options(joinedload(Document.shares).joinedload(DocumentShare.user))
        .filter(
            or_(
                Document.ownerId == current_user.id,
                Document.shares.any(DocumentShare.userId == current_user.id)
            )
        )
        .order_by(Document.createdAt.desc())
        .all()
    )
    
    # Check for help document
    doc_ids = {doc.id for doc in documents}
    help_doc = (
        db.query(Document)
        .options(joinedload(Document.shares).joinedload(DocumentShare.user))
        .filter(Document.displayName == HELP_DOC_DISPLAY_NAME)
        .first()
    )
    if help_doc and help_doc.id not in doc_ids:
        documents.append(help_doc)
    
    if summary:
        # Return summary without text/blocks
        return [
            DocumentResponse(
                id=doc.id,
                displayName=doc.displayName,
                ragStoreName=doc.ragStoreName,
                sourceFiles=strip_source_files(doc.sourceFiles or []),
                ownerId=doc.ownerId,
                tags=doc.tags or [],
                link=doc.link,
                createdAt=doc.createdAt,
                updatedAt=doc.updatedAt,
                shares=[
                    DocumentShareResponse(
                        id=share.id,
                        role=share.role.value,
                        user=UserSummary(
                            id=share.user.id,
                            email=share.user.email,
                            firstName=share.user.firstName,
                            lastName=share.user.lastName
                        ),
                        createdAt=share.createdAt
                    )
                    for share in doc.shares
                ]
            )
            for doc in documents
        ]
    
    return documents


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document by ID"""
    document = (
        db.query(Document)
        .options(joinedload(Document.shares).joinedload(DocumentShare.user))
        .filter(
            Document.id == document_id,
            or_(
                Document.ownerId == current_user.id,
                Document.shares.any(DocumentShare.userId == current_user.id)
            )
        )
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return document


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    document_data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new document"""
    try:
        # Validate displayName (required)
        if not document_data.displayName:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="displayName is required"
            )
        
        # sourceFiles can be empty array - user will add files later
        if document_data.sourceFiles is None:
            document_data.sourceFiles = []
        
        if not isinstance(document_data.sourceFiles, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="sourceFiles must be an array"
            )
        
        # Allow empty sourceFiles array - user can add files later via Add Data page
        # Only validate files if sourceFiles is not empty
        if len(document_data.sourceFiles) > 0:
            for idx, file in enumerate(document_data.sourceFiles):
                if not isinstance(file, dict):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"sourceFiles[{idx}] must be an object"
                    )
                # Ensure file has text or blocks with content
                has_text = file.get("text") and isinstance(file.get("text"), str) and file.get("text").strip()
                has_blocks = file.get("blocks") and isinstance(file.get("blocks"), list) and len(file.get("blocks", [])) > 0
                if not has_text and not has_blocks:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"sourceFiles[{idx}] must have either 'text' or 'blocks' with content"
                    )
        
        normalized_tags = normalize_tags(document_data.tags)
        normalized_link = document_data.link.strip()[:2048] if document_data.link else None
        
        # Create document
        from datetime import datetime
        now = datetime.now()
        document = Document(
            displayName=document_data.displayName,
            ragStoreName=os.getenv("QDRANT_COLLECTION", "documents"),
            sourceFiles=document_data.sourceFiles,
            ownerId=current_user.id,
            tags=normalized_tags,
            link=normalized_link,
            createdAt=now,
            updatedAt=now
        )
        db.add(document)
        db.flush()  # Get document.id without committing
        
        # Index document chunks in Qdrant (only if sourceFiles is not empty)
        # This is required for RAG functionality
        if document_data.sourceFiles and len(document_data.sourceFiles) > 0:
            try:
                print(f"🔍 Attempting to index document {document.id} in Qdrant...")
                await index_document_chunks(
                    document_id=str(document.id),
                    user_id=current_user.id,
                    source_files=document_data.sourceFiles,
                    embed_texts_func=embed_texts
                )
                print(f"✓ Document {document.id} successfully indexed in Qdrant")
            except Exception as e:
                # Log detailed error
                error_msg = str(e)
                print(f"❌ Failed to index document {document.id} in Qdrant: {error_msg}")
                import traceback
                traceback.print_exc()
                
                # Check if error is due to missing/invalid API key
                is_api_key_error = (
                    "API_KEY" in error_msg or 
                    "API key" in error_msg or 
                    "placeholder" in error_msg.lower() or
                    "Missing EMBEDDING_API_KEY" in error_msg
                )
                
                if is_api_key_error:
                    # For API key errors, provide clear instructions
                    db.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=(
                            f"Embedding service configuration error: {error_msg}. "
                            f"Please set a valid EMBEDDING_API_KEY in your .env file. "
                            f"You can find your API key at https://platform.openai.com/account/api-keys"
                        )
                    )
                
                # Rollback document creation if Qdrant indexing fails
                # This ensures data consistency
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Qdrant indexing failed: {error_msg}. Please ensure Qdrant service is running at {os.getenv('QDRANT_URL', 'http://localhost:6333')}"
                )
        else:
            print(f"ℹ️  Document {document.id} created without files - indexing will happen when files are added")
        
        db.commit()
        db.refresh(document)
        
        # Load shares for response
        try:
            document = (
                db.query(Document)
                .options(joinedload(Document.shares).joinedload(DocumentShare.user))
                .filter(Document.id == document.id)
                .first()
            )
        except Exception as e:
            print(f"⚠️  Error loading document with shares: {e}")
            # Continue with document without shares if loading fails
            pass
        
        return document
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating document: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating document: {str(e)}"
        )


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    document_data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a document"""
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            or_(
                Document.ownerId == current_user.id,
                Document.shares.any(
                    and_(
                        DocumentShare.userId == current_user.id,
                        DocumentShare.role == DocumentShareRoleEnum.editor
                    )
                )
            )
        )
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.displayName == HELP_DOC_DISPLAY_NAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ไม่สามารถแก้ไขคู่มือการใช้งานได้"
        )
    
    try:
        # Update fields
        if document_data.displayName is not None:
            document.displayName = document_data.displayName
        if document_data.sourceFiles is not None:
            if not isinstance(document_data.sourceFiles, list):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="sourceFiles must be an array"
                )
            # Validate sourceFiles structure
            for idx, file in enumerate(document_data.sourceFiles):
                if not isinstance(file, dict):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"sourceFiles[{idx}] must be an object"
                    )
                # Ensure at least one file has text or blocks
                has_text = file.get("text") and file.get("text").strip()
                has_blocks = file.get("blocks") and isinstance(file.get("blocks"), list) and len(file.get("blocks", [])) > 0
                if not has_text and not has_blocks:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"sourceFiles[{idx}] must have either 'text' or 'blocks' with content"
                    )
            document.sourceFiles = document_data.sourceFiles
        if document_data.tags is not None:
            document.tags = normalize_tags(document_data.tags)
        if document_data.link is not None:
            document.link = document_data.link.strip()[:2048] if document_data.link else None
        
        # Re-index if sourceFiles changed (before commit to ensure atomicity)
        if document_data.sourceFiles is not None:
            try:
                # Delete old vectors first (best effort - won't fail if collection doesn't exist)
                await delete_document_vectors(str(document.id))
                
                # Only index if sourceFiles is not empty
                if len(document_data.sourceFiles) > 0:
                    # Index new chunks
                    await index_document_chunks(
                        document_id=str(document.id),
                        user_id=current_user.id,
                        source_files=document_data.sourceFiles,
                        embed_texts_func=embed_texts
                    )
                    print(f"✓ Document {document.id} successfully re-indexed in Qdrant")
                else:
                    print(f"ℹ️  Document {document.id} updated with empty sourceFiles - no indexing needed")
            except Exception as e:
                error_msg = str(e)
                print(f"❌ Failed to re-index document {document.id}: {error_msg}")
                import traceback
                traceback.print_exc()
                
                # Check if error is due to missing/invalid API key
                is_api_key_error = (
                    "API_KEY" in error_msg or 
                    "API key" in error_msg or 
                    "placeholder" in error_msg.lower() or
                    "Missing EMBEDDING_API_KEY" in error_msg
                )
                
                if is_api_key_error:
                    # For API key errors, provide clear instructions
                    db.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=(
                            f"Embedding service configuration error: {error_msg}. "
                            f"Please set a valid EMBEDDING_API_KEY in your .env file. "
                            f"You can find your API key at https://platform.openai.com/account/api-keys"
                        )
                    )
                
                # For other errors (Qdrant connection, etc.)
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Qdrant indexing failed: {error_msg}. Please ensure Qdrant service is running at {os.getenv('QDRANT_URL', 'http://localhost:6333')}"
                )
        
        # Commit only after successful re-indexing (if sourceFiles changed) or if no sourceFiles update
        try:
            db.commit()
            db.refresh(document)
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"❌ Database commit/refresh error for document {document.id}: {error_type}: {error_msg}")
            import traceback
            traceback.print_exc()
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {error_type}: {error_msg}"
            )
        
        # Load shares for response
        try:
            document = (
                db.query(Document)
                .options(joinedload(Document.shares).joinedload(DocumentShare.user))
                .filter(Document.id == document.id)
                .first()
            )
        except Exception as e:
            print(f"⚠️  Error loading document with shares: {e}")
            # Continue with document without shares if loading fails
            pass
        
        return document
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"❌ Error updating document {document_id}: {error_type}: {error_msg}")
        import traceback
        print("Full traceback:")
        traceback.print_exc()
        db.rollback()
        # Provide more detailed error message
        detail_msg = f"Error updating document: {error_type}: {error_msg}"
        if "IntegrityError" in error_type or "constraint" in error_msg.lower():
            detail_msg = f"Database constraint violation: {error_msg}. Please check your data."
        elif "OperationalError" in error_type or "connection" in error_msg.lower():
            detail_msg = f"Database connection error: {error_msg}. Please check database connection."
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail_msg
        )


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a document"""
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.ownerId == current_user.id)
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.displayName == HELP_DOC_DISPLAY_NAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ไม่สามารถลบคู่มือการใช้งานได้"
        )
    
    # Delete from Qdrant (best effort)
    try:
        await delete_document_vectors(str(document.id))
    except Exception as e:
        print(f"⚠️  Failed to delete document vectors: {e}")
    
    # Delete local files if any (best effort)
    local_doc_dir = LOCAL_FILES_ROOT / str(current_user.id) / str(document.id)
    try:
        if local_doc_dir.exists():
            import shutil
            shutil.rmtree(local_doc_dir, ignore_errors=True)
    except Exception as e:
        print(f"⚠️  Failed to delete local files: {e}")
    
    db.delete(document)
    db.commit()
    
    return {"ok": True}


@router.get("/{document_id}/shares", response_model=List[DocumentShareResponse])
async def get_document_shares(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document shares"""
    document = (
        db.query(Document)
        .options(joinedload(Document.shares).joinedload(DocumentShare.user))
        .filter(Document.id == document_id, Document.ownerId == current_user.id)
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return [
        DocumentShareResponse(
            id=share.id,
            role=share.role.value,
            user=UserSummary(
                id=share.user.id,
                email=share.user.email,
                firstName=share.user.firstName,
                lastName=share.user.lastName
            ),
            createdAt=share.createdAt
        )
        for share in document.shares
    ]


@router.post("/{document_id}/shares", response_model=List[DocumentShareResponse])
async def share_document(
    document_id: int,
    share_data: DocumentShareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Share a document with another user"""
    if not share_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email is required"
        )
    
    desired_role = share_data.role or "viewer"
    if desired_role not in ["viewer", "editor"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="role must be viewer or editor"
        )
    
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.ownerId == current_user.id)
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Find user by email
    user = db.query(User).filter(User.email == share_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner already has access"
        )
    
    # Create or update share
    share = (
        db.query(DocumentShare)
        .filter(
            DocumentShare.documentId == document_id,
            DocumentShare.userId == user.id
        )
        .first()
    )
    
    if share:
        share.role = DocumentShareRoleEnum(desired_role)
    else:
        share = DocumentShare(
            documentId=document_id,
            userId=user.id,
            role=DocumentShareRoleEnum(desired_role)
        )
        db.add(share)
    
    db.commit()
    db.refresh(share)
    
    # Return all shares
    shares = (
        db.query(DocumentShare)
        .options(joinedload(DocumentShare.user))
        .filter(DocumentShare.documentId == document_id)
        .all()
    )
    
    return [
        DocumentShareResponse(
            id=s.id,
            role=s.role.value,
            user={
                "id": s.user.id,
                "email": s.user.email,
                "firstName": s.user.firstName,
                "lastName": s.user.lastName
            },
            createdAt=s.createdAt
        )
        for s in shares
    ]


@router.delete("/{document_id}/shares", response_model=List[DocumentShareResponse])
async def delete_document_share(
    document_id: int,
    share_data: DocumentShareDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove document share"""
    if not share_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email is required"
        )
    
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.ownerId == current_user.id)
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    user = db.query(User).filter(User.email == share_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.query(DocumentShare).filter(
        DocumentShare.documentId == document_id,
        DocumentShare.userId == user.id
    ).delete()
    
    db.commit()
    
    # Return remaining shares
    shares = (
        db.query(DocumentShare)
        .options(joinedload(DocumentShare.user))
        .filter(DocumentShare.documentId == document_id)
        .all()
    )
    
    return [
        DocumentShareResponse(
            id=s.id,
            role=s.role.value,
            user={
                "id": s.user.id,
                "email": s.user.email,
                "firstName": s.user.firstName,
                "lastName": s.user.lastName
            },
            createdAt=s.createdAt
        )
        for s in shares
    ]


@router.get("/{document_id}/files/{file_index}/download")
async def download_document_file(
    document_id: int,
    file_index: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download original file from document"""
    store_raw_files = os.getenv("STORE_RAW_FILES", "true").lower() == "true"
    if not store_raw_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original file storage is disabled"
        )
    
    if not isinstance(file_index, int) or file_index < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file index"
        )
    
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            or_(
                Document.ownerId == current_user.id,
                Document.shares.any(DocumentShare.userId == current_user.id)
            )
        )
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    source_files = document.sourceFiles or []
    if not isinstance(source_files, list) or file_index >= len(source_files):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    file = source_files[file_index]
    storage = file.get("storage") if isinstance(file, dict) else None
    file_name = file.get("name", f"file-{file_index + 1}") if isinstance(file, dict) else f"file-{file_index + 1}"
    
    # Handle S3 storage
    if storage and isinstance(storage, dict) and storage.get("provider") == "s3":
        if storage.get("url"):
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=storage["url"])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is not publicly accessible (missing storage.url)"
        )
    
    # Handle local storage
    file_path = storage.get("path") if storage and isinstance(storage, dict) else None
    if not file_path or not isinstance(file_path, str):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original file not available"
        )
    
    # Security check: ensure path is inside LOCAL_FILES_ROOT
    try:
        resolved_path = Path(file_path).resolve()
        resolved_root = LOCAL_FILES_ROOT.resolve()
        if not str(resolved_path).startswith(str(resolved_root)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file path"
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path"
        )
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File missing on disk"
        )
    
    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="application/octet-stream"
    )


@router.post("/{document_id}/files/ocr", response_model=Dict[str, Any])
async def process_file_with_ocr(
    document_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a file with OCR and return extracted text"""
    from app.services.ocr_service import extract_text_from_file
    
    # Get document
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            or_(
                Document.ownerId == current_user.id,
                Document.shares.any(
                    and_(
                        DocumentShare.userId == current_user.id,
                        DocumentShare.role == DocumentShareRoleEnum.editor
                    )
                )
            )
        )
        .first()
    )
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.displayName == HELP_DOC_DISPLAY_NAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ไม่สามารถแก้ไขคู่มือการใช้งานได้"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Process with OCR
        ocr_result = await extract_text_from_file(
            file_content=file_content,
            filename=file.filename,
            lang=os.getenv("OCR_LANG", "th"),
            max_pages=int(os.getenv("OCR_MAX_PAGES", "30")),
            dpi=int(os.getenv("OCR_DPI", "200")),
            use_angle_cls=os.getenv("OCR_USE_ANGLE_CLS", "true").lower() == "true"
        )
        
        if not ocr_result.get("ok", False):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"OCR processing failed: {ocr_result.get('error', 'Unknown error')}"
            )
        
        # Extract text from OCR result
        extracted_text = ocr_result.get("text", "")
        blocks = ocr_result.get("blocks", [])
        
        # Format response
        result = {
            "ok": True,
            "filename": file.filename,
            "text": extracted_text,
            "blocks": blocks if blocks else [{"text": extracted_text, "label": "Content"}] if extracted_text else [],
            "metadata": ocr_result.get("metadata", {})
        }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"❌ OCR processing error: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file with OCR: {error_msg}"
        )


@router.get("/qdrant/status")
async def get_qdrant_status(
    current_user: User = Depends(get_current_user)
):
    """
    Check Qdrant connection and collection status
    Note: Qdrant uses 'collections' not 'tables' (like PostgreSQL)
    """
    from app.services.qdrant_client import QDRANT_COLLECTION, QDRANT_URL, _qdrant_request
    
    try:
        # Check connection and get version info
        is_connected = await check_qdrant_connection()
        qdrant_info = None
        try:
            qdrant_info = await _qdrant_request("/", method="GET")
        except:
            pass
        
        if not is_connected:
            return {
                "connected": False,
                "collection_exists": False,
                "qdrant_version": qdrant_info.get("version") if qdrant_info else None,
                "message": f"Qdrant is not accessible at {QDRANT_URL}. Please check if Qdrant service is running.",
                "note": "Qdrant uses 'collections' (not 'tables'). Collection will be created automatically when you index your first document."
            }
        
        # Check collection
        try:
            collection_info = await _qdrant_request(f"/collections/{QDRANT_COLLECTION}", method="GET")
            if collection_info and collection_info.get("result"):
                config = collection_info["result"].get("config", {})
                vectors_config = config.get("params", {}).get("vectors", {})
                points_count = collection_info["result"].get("points_count", 0)
                
                return {
                    "connected": True,
                    "collection_exists": True,
                    "collection_name": QDRANT_COLLECTION,
                    "qdrant_url": QDRANT_URL,
                    "qdrant_version": qdrant_info.get("version") if qdrant_info else None,
                    "vector_size": vectors_config.get("size"),
                    "distance": vectors_config.get("distance"),
                    "points_count": points_count,
                    "message": f"Collection '{QDRANT_COLLECTION}' exists with {points_count} vectors",
                    "note": "Qdrant uses 'collections' (not 'tables'). This collection stores document vectors for RAG search."
                }
            else:
                return {
                    "connected": True,
                    "collection_exists": False,
                    "collection_name": QDRANT_COLLECTION,
                    "qdrant_url": QDRANT_URL,
                    "qdrant_version": qdrant_info.get("version") if qdrant_info else None,
                    "message": f"Collection '{QDRANT_COLLECTION}' does not exist yet. It will be created automatically when you index your first document.",
                    "note": "Qdrant uses 'collections' (not 'tables'). Collection will be created automatically when you add files to a knowledge base."
                }
        except Exception as e:
            error_msg = str(e)
            if "404" in error_msg or "Not found" in error_msg or "doesn't exist" in error_msg:
                return {
                    "connected": True,
                    "collection_exists": False,
                    "collection_name": QDRANT_COLLECTION,
                    "qdrant_url": QDRANT_URL,
                    "qdrant_version": qdrant_info.get("version") if qdrant_info else None,
                    "message": f"Collection '{QDRANT_COLLECTION}' does not exist yet. It will be created automatically when you index your first document.",
                    "note": "Qdrant uses 'collections' (not 'tables'). Collection will be created automatically when you add files to a knowledge base."
                }
            raise
        
    except Exception as e:
        return {
            "connected": False,
            "collection_exists": False,
            "error": str(e),
            "message": f"Error checking Qdrant status: {str(e)}",
            "note": "Qdrant uses 'collections' (not 'tables'). Make sure Qdrant service is running."
        }
