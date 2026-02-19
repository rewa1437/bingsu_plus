"""
Chat message routes
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import exists
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.database import get_db
from app.models import ChatMessage, Chat, User, chat_users
from app.schemas.chat_message import ChatMessageCreate, ChatMessageUpdate, ChatMessageResponse
from app.dependencies import get_current_user
from app.services.rag_service import retrieve_grounding_chunks

router = APIRouter(prefix="/chats/{chat_id}/messages", tags=["chat-messages"])


class BotResponseRequest(BaseModel):
    """Request for bot response"""
    message: str
    document_ids: Optional[List[str]] = None


class BotResponseResponse(BaseModel):
    """Response from bot"""
    message: str
    retrieved_context: Optional[List[dict]] = None


@router.get("", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    chat_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all messages in a chat"""
    chat_exists = db.query(exists().where(Chat.id == chat_id)).scalar()
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    membership = db.query(
        exists().where(
            (chat_users.c.chatId == chat_id) & 
            (chat_users.c.userId == current_user.id)
        )
    ).scalar()
    
    if not membership:
        raise HTTPException(status_code=403, detail="User is not a member of this chat")
    
    messages = (
        db.query(ChatMessage)
        .options(joinedload(ChatMessage.sender))
        .filter(ChatMessage.chatId == chat_id)
        .order_by(ChatMessage.createdAt.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return messages


@router.post("", response_model=ChatMessageResponse, status_code=201)
async def create_chat_message(
    chat_id: int,
    message: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new message in chat"""
    chat_exists = db.query(exists().where(Chat.id == chat_id)).scalar()
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    membership = db.query(
        exists().where(
            (chat_users.c.chatId == chat_id) & 
            (chat_users.c.userId == current_user.id)
        )
    ).scalar()
    
    if not membership:
        raise HTTPException(status_code=403, detail="User is not a member of this chat")
    
    now = datetime.now()
    
    # Prevent duplicate messages
    one_second_ago = now - timedelta(seconds=1)
    duplicate_check = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.chatId == chat_id,
            ChatMessage.userId == current_user.id,
            ChatMessage.message == message.message,
            ChatMessage.createdAt >= one_second_ago
        )
        .first()
    )
    
    if duplicate_check:
        return duplicate_check
    
    db_message = ChatMessage(
        chatId=chat_id,
        userId=current_user.id,
        message=message.message,
        updatedAt=now
    )
    db.add(db_message)
    
    # Update chat's lastUsed
    db.execute(
        Chat.__table__.update()
        .where(Chat.id == chat_id)
        .values(lastUsed=now, updatedAt=now)
    )
    
    db.commit()
    db.refresh(db_message)
    return db_message


@router.put("/{message_id}", response_model=ChatMessageResponse)
async def update_chat_message(
    chat_id: int,
    message_id: int,
    message: ChatMessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update message (only sender can update)"""
    db_message = (
        db.query(ChatMessage)
        .filter(ChatMessage.id == message_id, ChatMessage.chatId == chat_id)
        .first()
    )
    if not db_message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if db_message.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Only message sender can update")
    
    db_message.message = message.message
    db.commit()
    db.refresh(db_message)
    return db_message


@router.delete("/{message_id}")
async def delete_chat_message(
    chat_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete message (only sender can delete)"""
    db_message = (
        db.query(ChatMessage)
        .filter(ChatMessage.id == message_id, ChatMessage.chatId == chat_id)
        .first()
    )
    if not db_message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if db_message.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Only message sender can delete")
    
    db.delete(db_message)
    db.commit()
    return {"message": "Message deleted successfully"}


@router.post("/bot-response", response_model=BotResponseResponse)
async def create_bot_response(
    chat_id: int,
    request: BotResponseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create bot response using RAG"""
    # Verify chat exists and user is member
    chat_exists = db.query(exists().where(Chat.id == chat_id)).scalar()
    if not chat_exists:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    membership = db.query(
        exists().where(
            (chat_users.c.chatId == chat_id) & 
            (chat_users.c.userId == current_user.id)
        )
    ).scalar()
    
    if not membership:
        raise HTTPException(status_code=403, detail="User is not a member of this chat")
    
    # Get document IDs (if provided, otherwise use all documents user has access to)
    document_ids = request.document_ids or []
    
    # Retrieve relevant chunks using RAG
    retrieved_context = []
    if document_ids:
        try:
            chunks = await retrieve_grounding_chunks(document_ids, request.message)
            retrieved_context = [
                {
                    "text": chunk.get("retrievedContext", {}).get("text"),
                    "title": chunk.get("retrievedContext", {}).get("title"),
                    "docId": chunk.get("retrievedContext", {}).get("docId"),
                    "score": chunk.get("score", 0)
                }
                for chunk in chunks
            ]
        except Exception as e:
            print(f"⚠️  RAG retrieval failed: {e}")
            # Continue without context
    
    # TODO: Generate bot response using LLM with retrieved context
    # For now, return a simple response
    bot_message = f"Bot response to: {request.message}"
    if retrieved_context:
        bot_message += f" (Found {len(retrieved_context)} relevant chunks)"
    
    # Create bot message in chat
    now = datetime.now()
    db_message = ChatMessage(
        chatId=chat_id,
        userId=current_user.id,  # TODO: Use bot user ID if available
        message=bot_message,
        updatedAt=now
    )
    db.add(db_message)
    
    # Update chat's lastUsed
    db.execute(
        Chat.__table__.update()
        .where(Chat.id == chat_id)
        .values(lastUsed=now, updatedAt=now)
    )
    
    db.commit()
    db.refresh(db_message)
    
    return BotResponseResponse(
        message=bot_message,
        retrieved_context=retrieved_context if retrieved_context else None
    )
