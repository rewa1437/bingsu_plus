"""
Bot routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import exists
from typing import List

from app.database import get_db
from app.models import Bot, Document, DocumentShare, bot_documents
from app.schemas.bot import BotCreate, BotUpdate, BotResponse
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/bots", tags=["bots"])

HELP_BOT_NAME = "บอทช่วยสอน"


def format_bot(bot: Bot) -> dict:
    """Format bot for response"""
    return {
        "id": bot.id,
        "name": bot.name,
        "prompt": bot.prompt,
        "description": bot.description,
        "model": bot.model,
        "avatarUrl": bot.avatarUrl,
        "enabled": bot.enabled if bot.enabled is not None else True,
        "ownerId": bot.ownerId,
        "createdAt": bot.createdAt,
        "updatedAt": bot.updatedAt,
        "documents": [
            {"id": doc.id, "displayName": doc.displayName}
            for doc in (bot.documents if bot.documents else [])
        ]
    }


@router.get("", response_model=List[BotResponse])
async def get_bots(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all bots owned by current user"""
    bots = (
        db.query(Bot)
        .options(joinedload(Bot.documents))
        .filter(Bot.ownerId == current_user.id)
        .order_by(Bot.createdAt.desc())
        .all()
    )
    
    # Check if user has help bot
    has_help_bot = any(b.name == HELP_BOT_NAME for b in bots)
    if not has_help_bot:
        help_bot = (
            db.query(Bot)
            .options(joinedload(Bot.documents))
            .filter(Bot.name == HELP_BOT_NAME)
            .first()
        )
        if help_bot:
            bots.append(help_bot)
    
    return [format_bot(bot) for bot in bots]


@router.post("", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
async def create_bot(
    bot_data: BotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new bot"""
    try:
        if not bot_data.name or not bot_data.prompt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="name and prompt are required"
            )
        
        # Validate document IDs if provided
        valid_document_ids = []
        if bot_data.documentIds:
            unique_ids = list(set([id for id in bot_data.documentIds if id]))
            if unique_ids:
                try:
                    # Check if user has access to documents (owner or shared)
                    accessible_docs = (
                        db.query(Document)
                        .filter(
                            Document.id.in_(unique_ids),
                            (
                                (Document.ownerId == current_user.id) |
                                (Document.shares.any(DocumentShare.userId == current_user.id))
                            )
                        )
                        .all()
                    )
                    valid_document_ids = [doc.id for doc in accessible_docs]
                except Exception as e:
                    print(f"⚠️  Error validating documents: {e}")
                    # Continue without documents if validation fails
                    valid_document_ids = []
        
        # Create bot
        from datetime import datetime
        now = datetime.now()
        bot = Bot(
            name=bot_data.name,
            prompt=bot_data.prompt,
            description=bot_data.description,
            model=bot_data.model,
            avatarUrl=bot_data.avatarUrl,
            ownerId=current_user.id,
            enabled=bot_data.enabled if bot_data.enabled is not None else True,
            createdAt=now,
            updatedAt=now
        )
        db.add(bot)
        db.flush()  # Get bot.id
        
        # Associate documents
        if valid_document_ids:
            try:
                for doc_id in valid_document_ids:
                    db.execute(
                        bot_documents.insert().values(botId=bot.id, documentId=doc_id)
                    )
            except Exception as e:
                print(f"⚠️  Error associating documents: {e}")
                # Rollback and continue without documents
                db.rollback()
                db.flush()
        
        db.commit()
        db.refresh(bot)
        
        # Load documents for response
        try:
            bot_with_docs = (
                db.query(Bot)
                .options(joinedload(Bot.documents))
                .filter(Bot.id == bot.id)
                .first()
            )
            if bot_with_docs:
                bot = bot_with_docs
        except Exception as e:
            print(f"⚠️  Error loading bot with documents: {e}")
            # Continue with bot without documents if loading fails
            pass
        
        # Return formatted bot (will be validated against BotResponse schema)
        return format_bot(bot)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating bot: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating bot: {str(e)}"
        )


@router.patch("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: int,
    bot_data: BotUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a bot"""
    bot = (
        db.query(Bot)
        .filter(Bot.id == bot_id, Bot.ownerId == current_user.id)
        .first()
    )
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found"
        )
    
    if bot.name == HELP_BOT_NAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ไม่สามารถแก้ไขบอทช่วยสอนได้"
        )
    
    # Update fields
    if bot_data.name is not None:
        bot.name = bot_data.name
    if bot_data.prompt is not None:
        bot.prompt = bot_data.prompt
    if bot_data.description is not None:
        bot.description = bot_data.description
    if bot_data.model is not None:
        bot.model = bot_data.model
    if bot_data.avatarUrl is not None:
        bot.avatarUrl = bot_data.avatarUrl
    if bot_data.enabled is not None:
        bot.enabled = bot_data.enabled
    
    # Update documents if provided
    if bot_data.documentIds is not None:
        # Delete existing associations
        db.execute(
            bot_documents.delete().where(bot_documents.c.botId == bot.id)
        )
        
        # Add new associations
        if bot_data.documentIds:
            unique_ids = list(set([id for id in bot_data.documentIds if id]))
            if unique_ids:
                accessible_docs = (
                    db.query(Document)
                    .filter(
                        Document.id.in_(unique_ids),
                        (
                            (Document.ownerId == current_user.id) |
                            (Document.shares.any(DocumentShare.userId == current_user.id))
                        )
                    )
                    .all()
                )
                valid_ids = [doc.id for doc in accessible_docs]
                for doc_id in valid_ids:
                    db.execute(
                        bot_documents.insert().values(botId=bot.id, documentId=doc_id)
                    )
    
    db.commit()
    db.refresh(bot)
    
    # Load documents for response
    bot = (
        db.query(Bot)
        .options(joinedload(Bot.documents))
        .filter(Bot.id == bot.id)
        .first()
    )
    
    return format_bot(bot)


@router.delete("/{bot_id}")
async def delete_bot(
    bot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a bot"""
    bot = (
        db.query(Bot)
        .filter(Bot.id == bot_id, Bot.ownerId == current_user.id)
        .first()
    )
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot not found"
        )
    
    if bot.name == HELP_BOT_NAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ไม่สามารถลบบอทช่วยสอนได้"
        )
    
    db.delete(bot)
    db.commit()
    
    return {"ok": True}
