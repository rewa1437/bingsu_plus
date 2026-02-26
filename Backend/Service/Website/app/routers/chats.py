"""
Chat routes
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import exists
from typing import List

from app.database import get_db
from app.models import Chat, User, chat_users, ChatUserRoleEnum
from app.schemas.chat import ChatCreate, ChatUpdate, ChatResponse, ChatUserCreate, ChatUserUpdate
from app.dependencies import get_current_user

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("", response_model=List[ChatResponse])
async def get_chats(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all chats for current user"""
    chats = (
        db.query(Chat)
        .join(chat_users)
        .filter(chat_users.c.userId == current_user.id)
        .options(joinedload(Chat.users))
        .order_by(Chat.lastUsed.desc())
        .offset(skip)
        .limit(limit)
        .distinct()
        .all()
    )
    return chats


@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get chat by ID - requires user to be a member"""
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
    
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    return chat


@router.post("", response_model=ChatResponse, status_code=201)
async def create_chat(
    chat: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new chat"""
    from datetime import datetime
    from app.models import Bot
    
    # Validate botId if provided
    bot_id = chat.botId
    if bot_id:
        bot = db.query(Bot).filter(Bot.id == bot_id, Bot.ownerId == current_user.id).first()
        if not bot:
            raise HTTPException(status_code=404, detail=f"Bot not found or you don't have access to it")
        if not bot.enabled:
            raise HTTPException(status_code=400, detail=f"Bot is inactive. Please activate the bot first.")
    
    now = datetime.now()
    db_chat = Chat(
        name=chat.name, 
        botId=bot_id,
        createdAt=now, 
        updatedAt=now, 
        lastUsed=now
    )
    db.add(db_chat)
    db.flush()
    
    db_chat.users.append(current_user)
    
    if chat.user_ids:
        user_ids_to_add = [uid for uid in chat.user_ids if uid != current_user.id]
        if user_ids_to_add:
            users_to_add = db.query(User).filter(User.id.in_(user_ids_to_add)).all()
            if len(users_to_add) != len(user_ids_to_add):
                found_ids = {u.id for u in users_to_add}
                missing_ids = set(user_ids_to_add) - found_ids
                raise HTTPException(status_code=404, detail=f"Users not found: {list(missing_ids)}")
            db_chat.users.extend(users_to_add)
    
    db.commit()
    db.refresh(db_chat)
    return db_chat


@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: int, 
    chat: ChatUpdate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update chat - requires user to be a member"""
    db_chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not db_chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    membership = db.query(
        exists().where(
            (chat_users.c.chatId == chat_id) & 
            (chat_users.c.userId == current_user.id)
        )
    ).scalar()
    
    if not membership:
        raise HTTPException(status_code=403, detail="User is not a member of this chat")
    
    if chat.name is not None:
        db_chat.name = chat.name
    
    db.commit()
    db.refresh(db_chat)
    return db_chat


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete chat - requires user to be a member"""
    db_chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not db_chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    membership = db.query(
        exists().where(
            (chat_users.c.chatId == chat_id) & 
            (chat_users.c.userId == current_user.id)
        )
    ).scalar()
    
    if not membership:
        raise HTTPException(status_code=403, detail="User is not a member of this chat")
    
    db.delete(db_chat)
    db.commit()
    return {"message": "Chat deleted successfully"}
