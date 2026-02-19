"""
Document schemas for request/response validation
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.schemas.user import UserSummary


class DocumentShareResponse(BaseModel):
    """Schema for document share response"""
    id: int
    role: str
    user: UserSummary
    createdAt: datetime

    class Config:
        from_attributes = True


class DocumentBase(BaseModel):
    """Base document schema"""
    displayName: str = Field(..., min_length=1, max_length=255, description="Document display name")
    sourceFiles: List[Dict[str, Any]] = Field(default=[], description="Source files with text/blocks (can be empty)")
    tags: List[str] = Field(default=[], max_items=20, description="Tags (max 20)")
    link: Optional[str] = Field(None, max_length=2048, description="External link")


class DocumentCreate(DocumentBase):
    """Schema for creating a document"""
    pass


class DocumentUpdate(BaseModel):
    """Schema for updating a document"""
    displayName: Optional[str] = Field(None, min_length=1, max_length=255)
    sourceFiles: Optional[List[Dict[str, Any]]] = None
    tags: Optional[List[str]] = Field(None, max_items=20)
    link: Optional[str] = Field(None, max_length=2048)


class DocumentShareRequest(BaseModel):
    """Schema for sharing a document"""
    email: str = Field(..., description="User email to share with")
    role: str = Field("viewer", description="Share role: viewer or editor")


class DocumentShareDeleteRequest(BaseModel):
    """Schema for deleting a share"""
    email: str = Field(..., description="User email to remove share")


class DocumentSummary(BaseModel):
    """Summary schema for document (used in bot response)"""
    id: int
    displayName: str

    class Config:
        from_attributes = True


class DocumentResponse(DocumentBase):
    """Schema for document response"""
    id: int
    ragStoreName: str
    ownerId: int
    createdAt: datetime
    updatedAt: datetime
    shares: List[DocumentShareResponse] = []

    class Config:
        from_attributes = True
