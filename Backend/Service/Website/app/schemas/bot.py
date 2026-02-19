"""
Bot schemas for request/response validation
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from app.schemas.document import DocumentSummary


class BotBase(BaseModel):
    """Base bot schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Bot name")
    prompt: str = Field(..., min_length=1, description="Bot prompt/instructions")
    description: Optional[str] = Field(None, max_length=1000, description="Bot description")
    model: Optional[str] = Field(None, max_length=100, description="Model name")
    avatarUrl: Optional[str] = Field(None, max_length=2048, description="Avatar URL")
    enabled: bool = Field(True, description="Whether bot is enabled")


class BotCreate(BotBase):
    """Schema for creating a bot"""
    documentIds: Optional[List[int]] = Field(None, description="List of document IDs to associate with bot")


class BotUpdate(BaseModel):
    """Schema for updating a bot"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    prompt: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, max_length=1000)
    model: Optional[str] = Field(None, max_length=100)
    avatarUrl: Optional[str] = Field(None, max_length=2048)
    enabled: Optional[bool] = None
    documentIds: Optional[List[int]] = None


class BotResponse(BotBase):
    """Schema for bot response"""
    id: int
    ownerId: int
    createdAt: datetime
    updatedAt: datetime
    documents: List[DocumentSummary] = []

    class Config:
        from_attributes = True
