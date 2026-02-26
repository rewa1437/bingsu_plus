"""
User routes - User information and profile
"""
import os
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import User, Credential, UserRoleEnum, UserApprovalStatusEnum
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserRegister, RegisterResponse
from app.utils.password import hash_password
from app.utils.verification import generate_verification_token
from app.dependencies import get_current_user, get_current_admin_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserResponse])
async def get_users(
    skip: int = 0, 
    limit: int = 100, 
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = (
        db.query(User)
        .options(joinedload(User.credential))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return users


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile"""
    user = (
        db.query(User)
        .options(joinedload(User.credential))
        .filter(User.id == current_user.id)
        .first()
    )
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    user = (
        db.query(User)
        .options(joinedload(User.credential))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate, 
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new user (admin only)"""
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    existing_credential = db.query(Credential).filter(Credential.username == user.username).first()
    if existing_credential:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
    
    hashed_password = await hash_password(user.password)
    now = datetime.now()
    
    db_user = User(
        email=user.email,
        firstName=user.firstName,
        lastName=user.lastName,
        createdAt=now,
        updatedAt=now
    )
    db.add(db_user)
    db.flush()
    
    db_credential = Credential(
        userId=db_user.id,
        username=user.username,
        password=hashed_password,
        createdAt=now,
        updatedAt=now
    )
    db.add(db_credential)
    
    db.commit()
    db.refresh(db_user)
    
    db_user = (
        db.query(User)
        .options(joinedload(User.credential))
        .filter(User.id == db_user.id)
        .first()
    )
    return db_user


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user: UserRegister, 
    db: Session = Depends(get_db)
):
    """Register a new user with email and full name only"""
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    firstName = None
    lastName = None
    if user.fullName:
        name_parts = user.fullName.strip().split(' ', 1)
        firstName = name_parts[0] if name_parts else None
        lastName = name_parts[1] if len(name_parts) > 1 else None
    
    verification_token = generate_verification_token()
    now = datetime.now()
    
    from datetime import timedelta
    db_user = User(
        email=user.email,
        firstName=firstName,
        lastName=lastName,
        emailVerified=False,
        emailVerificationToken=verification_token,
        emailVerificationExpiresAt=now + timedelta(days=7),  # 7 days expiry
        createdAt=now,
        updatedAt=now
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    db_user = (
        db.query(User)
        .options(joinedload(User.credential))
        .filter(User.id == db_user.id)
        .first()
    )
    
    _is_dev = os.getenv("ENV", "development").lower() == "development"
    return RegisterResponse(
        id=db_user.id,
        email=db_user.email,
        firstName=db_user.firstName,
        lastName=db_user.lastName,
        emailVerified=db_user.emailVerified,
        role=db_user.role.value,
        approvalStatus=db_user.approvalStatus.value,
        isActive=db_user.isActive,
        avatarUrl=db_user.avatarUrl,
        createdAt=db_user.createdAt,
        updatedAt=db_user.updatedAt,
        verificationToken=verification_token if _is_dev else None,
        credential=None
    )


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    if user.email and user.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user.email).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        current_user.email = user.email
    
    if user.firstName is not None:
        current_user.firstName = user.firstName
    if user.lastName is not None:
        current_user.lastName = user.lastName
    
    current_user.updatedAt = datetime.now()
    db.commit()
    db.refresh(current_user)
    
    current_user = (
        db.query(User)
        .options(joinedload(User.credential))
        .filter(User.id == current_user.id)
        .first()
    )
    return current_user
