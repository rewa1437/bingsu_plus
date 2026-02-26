"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional
import os
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models import User, Credential, UserRoleEnum, UserApprovalStatusEnum
from app.schemas.user import (
    UserLogin, 
    UserResponse, 
    VerifyEmailRequest,
    SetPasswordRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ForgotPasswordResponse
)
from app.utils.jwt import create_access_token
from app.dependencies import get_current_user
from app.utils.password import verify_password, hash_password
from app.utils.verification import generate_verification_token

router = APIRouter(prefix="/auth", tags=["auth"])

# Create limiter instance - will be initialized with app.state.limiter in main.py
limiter = Limiter(key_func=get_remote_address)


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True


class ResendVerificationResponse(BaseModel):
    """Response for resend verification (includes token for development/testing)"""
    message: str
    success: bool = True
    verificationToken: Optional[str] = None


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    user = (
        db.query(User)
        .options(joinedload(User.credential))
        .filter(User.email == credentials.email)
        .first()
    )
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    # Check if email is verified
    if not user.emailVerified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email before logging in."
        )
    
    # Check if user is approved
    if user.approvalStatus != UserApprovalStatusEnum.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval from an administrator."
        )
    
    # Check if user is active
    if not user.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive."
        )
    
    # Check if credential exists
    if not user.credential:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    # Verify password
    is_valid = await verify_password(credentials.password, user.credential.password)
    
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user info"""
    return current_user


@router.post("/verify-email", response_model=MessageResponse)
@limiter.limit("10/hour")
async def verify_email(
    request: Request,
    verify_request: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """Verify email with verification token"""
    user = (
        db.query(User)
        .filter(User.emailVerificationToken == verify_request.token)
        .first()
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid verification token"
        )
    
    if user.emailVerified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    from datetime import datetime
    user.emailVerified = True
    user.emailVerifiedAt = datetime.now()
    db.commit()
    
    return MessageResponse(
        message="Email verified successfully. You can now set your password.",
        success=True
    )


@router.post("/set-password", response_model=MessageResponse)
@limiter.limit("5/hour")
async def set_password(
    request: Request,
    set_password_request: SetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Set password after email verification"""
    user = (
        db.query(User)
        .options(joinedload(User.credential))
        .filter(User.emailVerificationToken == set_password_request.token)
        .first()
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid verification token"
        )
    
    if not user.emailVerified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email must be verified before setting password"
        )
    
    # Hash password
    hashed_password = await hash_password(set_password_request.password)
    
    # Create or update credential
    if user.credential:
        user.credential.password = hashed_password
    else:
        from datetime import datetime
        credential = Credential(
            userId=user.id,
            username=user.email,
            password=hashed_password,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        db.add(credential)
    
    # Clear verification token
    user.emailVerificationToken = None
    db.commit()
    
    return MessageResponse(
        message="Password set successfully",
        success=True
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit("3/hour")
async def forgot_password(
    request: Request,
    forgot_request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """Request password reset"""
    user = db.query(User).filter(User.email == forgot_request.email).first()
    
    if not user:
        return ForgotPasswordResponse(
            message="If the email exists, a password reset email has been sent",
            success=True,
            resetToken=None
        )
    
    if not user.emailVerified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified. Please verify your email first."
        )
    
    from datetime import datetime, timedelta
    reset_token = generate_verification_token()
    user.passwordResetToken = reset_token
    user.passwordResetExpiresAt = datetime.now() + timedelta(hours=24)  # 24 hour expiry
    db.commit()
    
    _is_dev = os.getenv("ENV", "development").lower() == "development"
    return ForgotPasswordResponse(
        message="Password reset email sent (if email exists)",
        success=True,
        resetToken=reset_token if _is_dev else None
    )


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/hour")
async def reset_password(
    request: Request,
    reset_request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using reset token"""
    from datetime import datetime
    user = (
        db.query(User)
        .options(joinedload(User.credential))
        .filter(User.passwordResetToken == reset_request.token)
        .first()
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired reset token"
        )
    
    # Check token expiry
    if user.passwordResetExpiresAt and user.passwordResetExpiresAt < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    if not user.emailVerified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email must be verified before resetting password"
        )
    
    # Hash new password
    hashed_password = await hash_password(reset_request.password)
    
    # Update or create credential
    if user.credential:
        user.credential.password = hashed_password
    else:
        credential = Credential(
            userId=user.id,
            username=user.email,
            password=hashed_password,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        db.add(credential)
    
    # Clear reset token
    user.passwordResetToken = None
    user.passwordResetExpiresAt = None
    db.commit()
    
    return MessageResponse(
        message="Password reset successfully",
        success=True
    )
