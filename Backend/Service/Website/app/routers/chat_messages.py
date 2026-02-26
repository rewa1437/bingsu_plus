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
from app.models import ChatMessage, Chat, User, chat_users, Bot, bot_documents
from app.schemas.chat_message import ChatMessageCreate, ChatMessageUpdate, ChatMessageResponse
from app.dependencies import get_current_user
from app.services.rag_service import retrieve_grounding_chunks
from app.services.llm_service import generate_response
from app.utils.sanitize import sanitize_for_log

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
    
    # Get chat object
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get document IDs from chat.botId (priority) or from request
    document_ids = []
    
    # Priority 1: ใช้ documentIds จาก bot ที่อยู่ใน chat.botId
    if chat.botId:
        bot = db.query(Bot).filter(
            Bot.id == chat.botId,
            Bot.ownerId == current_user.id
        ).first()
        if bot:
            # Get documentIds from bot
            bot_docs = db.query(bot_documents.c.documentId).filter(
                bot_documents.c.botId == bot.id
            ).all()
            document_ids = [str(doc[0]) for doc in bot_docs]
            print(f"📝 Using documentIds from chat.botId (bot: {bot.name}): {document_ids}")
    
    # Priority 2: ถ้าไม่มี documentIds จาก chat.botId ให้ใช้จาก request
    if not document_ids:
        document_ids = request.document_ids or []
        print(f"📝 Using documentIds from request: {document_ids}")
    
    print(f"📝 User message: {request.message[:100]}...")
    
    # Retrieve relevant chunks using RAG
    retrieved_context = []
    rag_found_data = False
    RAG_SCORE_THRESHOLD = 0.5  # Minimum score threshold for considering context relevant
    
    if document_ids:
        try:
            print(f"🔍 Calling RAG service with {len(document_ids)} document IDs...")
            chunks = await retrieve_grounding_chunks(document_ids, request.message)
            print(f"✅ RAG returned {len(chunks)} chunks")
            
            # Filter chunks by score threshold
            retrieved_context = [
                {
                    "text": chunk.get("retrievedContext", {}).get("text"),
                    "title": chunk.get("retrievedContext", {}).get("title"),
                    "docId": chunk.get("retrievedContext", {}).get("docId"),
                    "score": chunk.get("score", 0)
                }
                for chunk in chunks
                if chunk.get("score", 0) >= RAG_SCORE_THRESHOLD
            ]
            
            # Check if we have any relevant context
            if retrieved_context and len(retrieved_context) > 0:
                rag_found_data = True
                print(f"📚 Retrieved {len(retrieved_context)} relevant context chunks (score >= {RAG_SCORE_THRESHOLD})")
            else:
                print(f"⚠️  No relevant context found (all chunks below score threshold {RAG_SCORE_THRESHOLD})")
                if chunks:
                    max_score = max([chunk.get("score", 0) for chunk in chunks])
                    print(f"   Highest score: {max_score}")
        except Exception as e:
            print(f"⚠️  RAG retrieval failed: {sanitize_for_log(str(e))}")
            # Continue without context
    else:
        print("⚠️  No document_ids provided, skipping RAG retrieval")
    
    # Get bot information from chat.botId (priority) or from document_ids
    system_prompt = None
    bot_model = None
    
    # Priority 1: ใช้ botId จาก chat
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if chat and chat.botId:
        bot = db.query(Bot).filter(
            Bot.id == chat.botId,
            Bot.ownerId == current_user.id
        ).first()
        if bot:
            system_prompt = bot.prompt
            # ถ้า bot.model เป็น "MATCHA AI" หรือชื่อ display อื่นๆ ให้ใช้ None เพื่อใช้ default model
            if bot.model and bot.model.upper() in ["MATCHA AI", "MATCHA", "MATCHA_AI"]:
                bot_model = None  # จะใช้ default model (gpt-4o-mini)
            else:
                bot_model = bot.model
            print(f"✅ Using bot from chat.botId: {bot.name} (ID: {bot.id})")
    
    # Priority 2: ถ้าไม่มี botId ใน chat ให้หา bot จาก document_ids
    if not system_prompt and document_ids:
        # Try to find bot that uses these documents
        from sqlalchemy import and_
        # Find bot that has any of the document_ids
        try:
            doc_ids_int = [int(doc_id) for doc_id in document_ids if doc_id]
            if doc_ids_int:
                bot = (
                    db.query(Bot)
                    .join(bot_documents, Bot.id == bot_documents.c.botId)
                    .filter(
                        and_(
                            Bot.ownerId == current_user.id,
                            Bot.enabled == True,
                            bot_documents.c.documentId.in_(doc_ids_int)
                        )
                    )
                    .first()
                )
                if bot:
                    system_prompt = bot.prompt
                    # ถ้า bot.model เป็น "MATCHA AI" หรือชื่อ display อื่นๆ ให้ใช้ None เพื่อใช้ default model
                    if bot.model and bot.model.upper() in ["MATCHA AI", "MATCHA", "MATCHA_AI"]:
                        bot_model = None  # จะใช้ default model (gpt-4o-mini)
                    else:
                        bot_model = bot.model
                    print(f"✅ Using bot from document_ids: {bot.name} (ID: {bot.id})")
        except (ValueError, TypeError) as e:
            print(f"⚠️ Error parsing document_ids: {type(e).__name__}")
    
    # Generate bot response using LLM with retrieved context
    # ถ้ามี document_ids แต่ไม่พบข้อมูลใน knowledge base ให้ตอบว่าไม่พบข้อมูล
    if document_ids and not rag_found_data:
        bot_message = "ขออภัย ไม่พบข้อมูลที่เกี่ยวข้องกับคำถามของคุณใน Knowledge Base ที่มีอยู่\n\nกรุณาลองถามคำถามอื่นหรือตรวจสอบว่า Knowledge Base มีข้อมูลที่เกี่ยวข้องหรือไม่"
        print("⚠️  No relevant data found in knowledge base, returning default message")
    elif document_ids and rag_found_data:
        # มี document_ids และพบข้อมูล - ใช้ LLM แต่ต้องตอบเฉพาะจาก knowledge base
        try:
            print(f"🤖 Generating AI response with {len(retrieved_context) if retrieved_context else 0} context chunks...")
            bot_message = await generate_response(
                user_message=request.message,
                system_prompt=system_prompt,
                context_chunks=retrieved_context if retrieved_context else None,
                model=bot_model
            )
            print(f"✅ AI response generated (length: {len(bot_message)})")
        except Exception as e:
            print(f"⚠️ Error generating bot response: {sanitize_for_log(str(e))}")
            # Fallback response — no internal details
            bot_message = "⚠️ เกิดข้อผิดพลาดในการสร้างคำตอบ กรุณาลองใหม่อีกครั้ง"
    else:
        # ไม่มี document_ids - ตอบตามปกติ (ไม่ใช้ knowledge base)
        try:
            print(f"🤖 Generating AI response without knowledge base...")
            bot_message = await generate_response(
                user_message=request.message,
                system_prompt=system_prompt,
                context_chunks=None,  # ไม่มี context
                model=bot_model
            )
            print(f"✅ AI response generated (length: {len(bot_message)})")
        except Exception as e:
            print(f"⚠️ Error generating bot response: {sanitize_for_log(str(e))}")
            bot_message = "⚠️ เกิดข้อผิดพลาดในการสร้างคำตอบ กรุณาลองใหม่อีกครั้ง"
    
    # Create bot message in chat
    now = datetime.now()
    db_message = ChatMessage(
        chatId=chat_id,
        userId=current_user.id,  # TODO: Use bot user ID if available
        message=bot_message,
        isAiGenerated=True,
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

