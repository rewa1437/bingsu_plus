"""
Credential routes - Authentication credentials management
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import User, Credential
from app.schemas.credential import (
    CredentialUpdate, 
    CredentialResponse,
    ChangePasswordRequest,
    ChangePasswordResponse
)
from app.dependencies import get_current_user
from app.utils.password import hash_password, verify_password

router = APIRouter(prefix="/credentials", tags=["credentials"])


@router.get("/me", response_model=CredentialResponse)
async def get_my_credential(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's credential"""
    credential = db.query(Credential).filter(Credential.userId == current_user.id).first()
    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found"
        )
    return credential


@router.put("/me", response_model=CredentialResponse)
async def update_my_credential(
    credential: CredentialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's credential"""
    db_credential = db.query(Credential).filter(Credential.userId == current_user.id).first()
    
    if not db_credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found"
        )
    
    if credential.username is not None:
        existing_credential = db.query(Credential).filter(
            Credential.username == credential.username,
            Credential.userId != current_user.id
        ).first()
        if existing_credential:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        db_credential.username = credential.username
    
    if credential.password is not None:
        db_credential.password = await hash_password(credential.password)
    
    db_credential.updatedAt = datetime.now()
    db.commit()
    db.refresh(db_credential)
    return db_credential


@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password - requires old password verification"""
    db_credential = db.query(Credential).filter(Credential.userId == current_user.id).first()
    
    if not db_credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found"
        )
    
    is_valid = await verify_password(password_data.old_password, db_credential.password)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    if password_data.old_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    hashed_new_password = await hash_password(password_data.new_password)
    db_credential.password = hashed_new_password
    db_credential.updatedAt = datetime.now()
    db.commit()
    
    return ChangePasswordResponse(
        message="Password changed successfully",
        success=True
    )
