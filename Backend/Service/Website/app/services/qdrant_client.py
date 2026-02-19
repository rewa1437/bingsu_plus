"""
Qdrant client for FastAPI
Used for vector search and document indexing
"""
import os
import uuid
import asyncio
from typing import List, Optional, Dict, Any
import httpx
from dotenv import load_dotenv

load_dotenv()

# Qdrant configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333").rstrip("/")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "documents")
QDRANT_DISTANCE = os.getenv("QDRANT_DISTANCE", "Cosine")
QDRANT_TOP_K = int(os.getenv("QDRANT_TOP_K", "6"))

# Collection state
_collection_ready = False
_collection_size: Optional[int] = None


def _get_headers() -> Dict[str, str]:
    """Get headers for Qdrant requests"""
    headers = {"Content-Type": "application/json"}
    if QDRANT_API_KEY:
        headers["api-key"] = QDRANT_API_KEY
    return headers


async def _qdrant_request(
    path: str,
    method: str = "GET",
    json_data: Optional[Dict[str, Any]] = None,
    timeout: float = 30.0
) -> Optional[Dict[str, Any]]:
    """Make request to Qdrant API"""
    url = f"{QDRANT_URL}{path}"
    headers = _get_headers()
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=json_data
            )
            
            if response.status_code == 204:
                return None
            
            if not response.is_success:
                error_text = response.text
                # Try to parse JSON error for better error message
                try:
                    error_json = response.json()
                    if isinstance(error_json, dict):
                        status_info = error_json.get("status", {})
                        if isinstance(status_info, dict):
                            error_detail = status_info.get("error", error_text)
                            # Use the detailed error message directly (don't wrap it)
                            # Prefer the detailed error message, but fallback to status code if not available
                            error_msg = error_detail if error_detail else (error_text if error_text else f"Qdrant request failed: {response.status_code}")
                        else:
                            error_msg = f"Qdrant request failed: {response.status_code} - {error_text}"
                    else:
                        error_msg = f"Qdrant request failed: {response.status_code} - {error_text}"
                except:
                    error_msg = f"Qdrant request failed: {response.status_code} - {error_text}"
                
                print(f"❌ {error_msg}")
                print(f"   URL: {url}")
                print(f"   Method: {method}")
                # Include status code in exception for easier detection
                # Store status code in exception for easier detection in ensure_collection
                exception = Exception(error_msg)
                exception.status_code = response.status_code  # Store status code for detection
                raise exception
            
            return response.json()
    except httpx.ConnectError as e:
        error_msg = f"Qdrant connection error: Cannot connect to {QDRANT_URL}. Is Qdrant running?"
        print(f"❌ {error_msg}")
        print(f"   Error: {str(e)}")
        raise Exception(error_msg)
    except httpx.TimeoutException as e:
        error_msg = f"Qdrant timeout: Request to {QDRANT_URL} timed out after {timeout}s"
        print(f"❌ {error_msg}")
        raise Exception(error_msg)
    except Exception as e:
        error_msg = f"Qdrant request error: {str(e)}"
        print(f"❌ {error_msg}")
        print(f"   URL: {url}")
        raise Exception(error_msg)


async def ensure_collection(vector_size: int) -> None:
    """Ensure Qdrant collection exists with correct vector size"""
    global _collection_ready, _collection_size
    
    # Quick check: if we already verified this collection exists with this size, skip
    # Note: This is a performance optimization, but we still check Qdrant to be safe
    if _collection_ready and _collection_size == vector_size:
        # Double-check that collection still exists (it might have been deleted)
        try:
            await _qdrant_request(f"/collections/{QDRANT_COLLECTION}", method="GET", timeout=5.0)
            print(f"✓ Collection '{QDRANT_COLLECTION}' already ready (size: {vector_size})")
            return
        except Exception:
            # Collection might have been deleted, reset state and continue
            print(f"⚠️  Collection '{QDRANT_COLLECTION}' was deleted, recreating...")
            _collection_ready = False
            _collection_size = None
    
    try:
        # Check if collection exists
        print(f"🔍 Checking if collection '{QDRANT_COLLECTION}' exists...")
        existing = await _qdrant_request(f"/collections/{QDRANT_COLLECTION}", method="GET")
        size = existing.get("result", {}).get("config", {}).get("params", {}).get("vectors", {}).get("size")
        
        if size and size != vector_size:
            raise Exception(f"Qdrant collection size mismatch (expected {vector_size}, got {size})")
        
        _collection_ready = True
        _collection_size = size or vector_size
        print(f"✓ Collection '{QDRANT_COLLECTION}' exists (size: {vector_size})")
        return
    except Exception as e:
        error_msg = str(e)
        # Check status code if available
        status_code = getattr(e, 'status_code', None)
        
        # Check for collection not found errors (404, Not found, doesn't exist)
        # Check both status code and error message (case-insensitive)
        error_msg_lower = error_msg.lower()
        is_not_found = (
            status_code == 404 or
            "404" in error_msg or 
            "not found" in error_msg_lower or 
            "doesn't exist" in error_msg_lower or
            "does not exist" in error_msg_lower or
            ("collection" in error_msg_lower and ("not found" in error_msg_lower or "doesn't exist" in error_msg_lower or "does not exist" in error_msg_lower))
        )
        
        print(f"   Error checking collection: status_code={status_code}, is_not_found={is_not_found}")
        print(f"   Error message (first 300 chars): {error_msg[:300]}")
        print(f"   Error message (lowercase): {error_msg_lower[:300]}")
        
        if is_not_found:
            # Create collection
            print(f"📦 Collection '{QDRANT_COLLECTION}' not found. Creating new collection with vector size {vector_size}...")
            try:
                create_response = await _qdrant_request(
                    f"/collections/{QDRANT_COLLECTION}",
                    method="PUT",
                    json_data={
                        "vectors": {
                            "size": vector_size,
                            "distance": QDRANT_DISTANCE,
                        }
                    }
                )
                # Verify collection was created
                verify_response = await _qdrant_request(f"/collections/{QDRANT_COLLECTION}", method="GET")
                if verify_response and verify_response.get("result"):
                    _collection_ready = True
                    _collection_size = vector_size
                    print(f"✓ Successfully created and verified collection '{QDRANT_COLLECTION}' with vector size {vector_size}")
                    return
                else:
                    raise Exception("Collection creation succeeded but verification failed")
            except Exception as create_error:
                error_msg = str(create_error)
                print(f"❌ Failed to create collection '{QDRANT_COLLECTION}': {error_msg}")
                # Reset state on failure
                _collection_ready = False
                _collection_size = None
                raise Exception(f"Failed to create Qdrant collection: {error_msg}")
        else:
            # Re-raise other errors
            print(f"❌ Error checking collection '{QDRANT_COLLECTION}': {error_msg}")
            # Reset state on error
            _collection_ready = False
            _collection_size = None
            raise


async def upsert_points(points: List[Dict[str, Any]], vector_size: Optional[int] = None) -> None:
    """Upsert points to Qdrant collection"""
    if not points:
        return
    
    # Ensure collection exists before upserting
    # If vector_size is provided, use it; otherwise try to infer from first point
    if vector_size is None and points and "vector" in points[0]:
        vector_size = len(points[0]["vector"])
    
    if vector_size:
        # Ensure collection exists (will create if needed)
        await ensure_collection(vector_size)
    
    await _qdrant_request(
        f"/collections/{QDRANT_COLLECTION}/points?wait=true",
        method="PUT",
        json_data={"points": points}
    )


async def delete_document_vectors(document_id: str) -> None:
    """Delete vectors for a document"""
    if not document_id:
        return
    
    try:
        # Check if collection exists first
        await _qdrant_request(f"/collections/{QDRANT_COLLECTION}", method="GET", timeout=5.0)
    except Exception as e:
        error_msg = str(e)
        # If collection doesn't exist, there's nothing to delete - just return
        if "404" in error_msg or "Not found" in error_msg or "doesn't exist" in error_msg.lower():
            print(f"ℹ️  Collection '{QDRANT_COLLECTION}' doesn't exist - nothing to delete for document {document_id}")
            return
        # For other errors, log but don't fail
        print(f"⚠️  Error checking collection before delete: {error_msg}")
        return
    
    try:
        await _qdrant_request(
            f"/collections/{QDRANT_COLLECTION}/points/delete?wait=true",
            method="POST",
            json_data={
                "filter": {
                    "must": [
                        {
                            "key": "docId",
                            "match": {"value": document_id}
                        }
                    ]
                }
            }
        )
        print(f"✓ Deleted vectors for document {document_id}")
    except Exception as e:
        error_msg = str(e)
        # If collection doesn't exist or no points found, that's OK
        if "404" in error_msg or "Not found" in error_msg or "doesn't exist" in error_msg.lower():
            print(f"ℹ️  No vectors to delete for document {document_id} (collection or points not found)")
            return
        # Log other errors but don't fail - this is a best-effort operation
        print(f"⚠️  Error deleting vectors for document {document_id}: {error_msg}")
        # Don't raise - allow operation to continue


async def search_qdrant(
    vector: List[float],
    doc_ids: Optional[List[str]] = None,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Search Qdrant collection"""
    if not vector or not len(vector):
        return []
    
    must = []
    if doc_ids:
        must.append({
            "key": "docId",
            "match": {"any": doc_ids}
        })
    
    response = await _qdrant_request(
        f"/collections/{QDRANT_COLLECTION}/points/search",
        method="POST",
        json_data={
            "vector": vector,
            "limit": limit or QDRANT_TOP_K,
            "with_payload": True,
            "filter": {"must": must} if must else None
        }
    )
    
    return response.get("result", []) if response else []


async def check_qdrant_connection() -> bool:
    """Check if Qdrant is accessible"""
    try:
        response = await _qdrant_request("/", method="GET", timeout=5.0)
        print(f"✓ Qdrant is accessible at {QDRANT_URL}")
        return True
    except Exception as e:
        print(f"❌ Qdrant connection check failed: {str(e)}")
        return False


async def index_document_chunks(
    document_id: str,
    user_id: int,
    source_files: List[Dict[str, Any]],
    embed_texts_func
) -> None:
    """Index document chunks to Qdrant"""
    print(f"🔍 Starting Qdrant indexing for document {document_id}...")
    print(f"   Qdrant URL: {QDRANT_URL}")
    print(f"   Collection: {QDRANT_COLLECTION}")
    
    try:
        # Validate input data from frontend
        if source_files is None:
            raise Exception("sourceFiles is None. Frontend may not have sent data correctly.")
        if not isinstance(source_files, list):
            raise Exception(f"sourceFiles must be a list, got {type(source_files).__name__}. Frontend data format is incorrect.")
        if len(source_files) == 0:
            raise Exception("sourceFiles is empty. Frontend sent no files to index.")
        
        print(f"   ✅ Received {len(source_files)} source files from frontend")
        print(f"   📋 First file structure: {list(source_files[0].keys()) if source_files else 'N/A'}")
        
        # Check Qdrant connection first
        if not await check_qdrant_connection():
            raise Exception(f"Qdrant is not accessible at {QDRANT_URL}. Please check if Qdrant service is running.")
        chunks = []
        print(f"   Processing {len(source_files or [])} source files...")
        for file_index, file in enumerate(source_files or []):
            # Validate file structure
            if not isinstance(file, dict):
                print(f"   ⚠️  File {file_index + 1} is not a dictionary: {type(file).__name__} - skipping")
                continue
            
            file_name = file.get("name") or file.get("fileName", f"file-{file_index + 1}")
            print(f"   Processing file {file_index + 1}: {file_name}")
            print(f"   File keys: {list(file.keys())}")
            
            # Support both "blocks" and direct "text" field
            blocks = file.get("blocks", []) if isinstance(file.get("blocks"), list) else []
            file_text = file.get("text", "").strip() if file.get("text") else ""
            
            print(f"   Blocks: {len(blocks) if blocks else 0}, Text length: {len(file_text)}")
            
            # Validate that file has content
            if not blocks and not file_text:
                print(f"   ⚠️  File {file_index + 1} ({file_name}) has no content: no 'blocks' and no 'text' field")
                print(f"   ⚠️  This indicates frontend may not have sent file content correctly")
            
            # If no blocks, try to use file.text directly
            if not blocks and file_text:
                blocks = [{"text": file_text, "label": "Content"}]
                print(f"   Using file.text as single block (length: {len(file_text)} chars)")
            
            if not blocks:
                print(f"   ⚠️  File {file_index + 1} has no blocks and no text content - skipping")
                continue
            
            print(f"   Found {len(blocks)} blocks in file {file_index + 1}")
            for index, block in enumerate(blocks):
                text = block.get("text", "").strip() if isinstance(block, dict) else ""
                if not text:
                    print(f"   ⚠️  Skipping empty block {index} in file {file_index + 1}")
                    continue
                chunks.append({
                    "text": text,
                    "payload": {
                        "docId": document_id,
                        "userId": user_id,
                        "fileName": file_name,
                        "label": block.get("label", f"Chunk {index + 1}"),
                        "chunkIndex": index,
                    }
                })
                print(f"   ✓ Added chunk {index + 1} (length: {len(text)} chars)")
        
        print(f"   Total chunks extracted: {len(chunks)}")
        
        if not chunks:
            error_msg = (
                f"No chunks to index for document {document_id}. "
                f"This usually means:\n"
                f"  1. Frontend sent sourceFiles without 'text' or 'blocks' fields\n"
                f"  2. All 'text' or 'blocks' fields are empty\n"
                f"  3. Frontend data format is incorrect\n"
                f"  Please check frontend code in AddKnowledgeData.js - ensure files have 'text' or 'blocks' with content."
            )
            print(f"❌ {error_msg}")
            print(f"   📋 Received sourceFiles structure:")
            for idx, f in enumerate(source_files[:3]):  # Show first 3 files
                print(f"      File {idx + 1}: keys={list(f.keys())}, has_text={'text' in f}, has_blocks={'blocks' in f}")
            raise Exception(error_msg)
        
        # Get embeddings with timeout
        try:
            import asyncio
            vectors = await asyncio.wait_for(
                embed_texts_func([chunk["text"] for chunk in chunks]),
                timeout=30.0  # 30 second timeout
            )
        except asyncio.TimeoutError:
            error_msg = f"Embedding timeout for document {document_id}"
            print(f"❌ {error_msg}")
            raise Exception(error_msg)
        except Exception as e:
            error_msg = str(e)
            if "API_KEY" in error_msg or "quota" in error_msg or "429" in error_msg:
                print(f"❌ Skipping Qdrant indexing: {error_msg}")
                raise Exception(f"Embedding API error: {error_msg}")
            # Re-raise embedding errors
            print(f"❌ Embedding error for document {document_id}: {error_msg}")
            raise Exception(f"Embedding error: {error_msg}")
        
        if not vectors or not vectors[0]:
            error_msg = (
                f"Empty vectors for document {document_id}. "
                f"This usually means:\n"
                f"  1. Embedding service returned empty/null vectors\n"
                f"  2. Text chunks were empty (frontend may have sent empty text)\n"
                f"  3. Embedding API error\n"
                f"  Check embedding service logs and ensure sourceFiles have valid text content."
            )
            print(f"❌ {error_msg}")
            print(f"   📋 Chunks sent to embedding: {len(chunks)} chunks")
            if chunks:
                print(f"   📋 First chunk preview: {chunks[0]['text'][:100]}...")
            raise Exception(error_msg)
        
        vector_size = len(vectors[0])
        
        # Ensure collection with timeout
        try:
            await asyncio.wait_for(ensure_collection(vector_size), timeout=10.0)
        except asyncio.TimeoutError:
            error_msg = f"Qdrant collection check timeout for document {document_id}"
            print(f"❌ {error_msg}")
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Qdrant collection error for document {document_id}: {str(e)}"
            print(f"❌ {error_msg}")
            raise Exception(error_msg)
        
        points = [
            {
                "id": str(uuid.uuid4()),
                "vector": vector,
                "payload": {
                    **chunks[i]["payload"],
                    "text": chunks[i]["text"]
                }
            }
            for i, vector in enumerate(vectors)
        ]
        
        # Batch upsert with timeout
        batch_size = 128
        for i in range(0, len(points), batch_size):
            try:
                await asyncio.wait_for(
                    upsert_points(points[i:i + batch_size], vector_size=vector_size),
                    timeout=30.0
                )
            except asyncio.TimeoutError:
                error_msg = f"Qdrant upsert timeout for document {document_id} batch {i}"
                print(f"❌ {error_msg}")
                raise Exception(error_msg)
            except Exception as e:
                error_msg = f"Qdrant upsert error for document {document_id}: {str(e)}"
                print(f"❌ {error_msg}")
                raise Exception(error_msg)
        
        print(f"✓ Successfully indexed {len(points)} chunks for document {document_id} in Qdrant")
    except Exception as e:
        # Log full error details
        error_msg = str(e)
        print(f"❌ Error indexing document {document_id} in Qdrant: {error_msg}")
        
        # Check if error indicates frontend data issue
        frontend_data_indicators = [
            "sourceFiles is None",
            "sourceFiles must be a list",
            "sourceFiles is empty",
            "no 'blocks' and no 'text' field",
            "No chunks to index",
            "Empty vectors"
        ]
        is_frontend_issue = any(indicator in error_msg for indicator in frontend_data_indicators)
        
        if is_frontend_issue:
            print(f"   ⚠️  This error likely indicates a frontend data format issue!")
            print(f"   ⚠️  Check AddKnowledgeData.js - ensure sourceFiles are sent correctly")
            print(f"   ⚠️  Expected format: sourceFiles = [{'{'} name, fileName, text, blocks [] {'}'}, ...]")
        
        import traceback
        print("Full traceback:")
        traceback.print_exc()
        # Re-raise to see the actual error
        raise Exception(f"Qdrant indexing failed: {error_msg}")
