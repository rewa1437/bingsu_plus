"""
Script to check chat data in database
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models import Chat, ChatMessage, User, chat_users
from sqlalchemy import text

def check_chat_data():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("CHAT DATA IN DATABASE")
        print("=" * 80)
        
        # Get all chats
        chats = db.query(Chat).order_by(Chat.id).all()
        print(f"\n📊 Total Chats: {len(chats)}")
        
        for chat in chats:
            print(f"\n{'='*80}")
            print(f"Chat ID: {chat.id}")
            print(f"Chat Name: {chat.name}")
            print(f"Created At: {chat.createdAt}")
            print(f"Updated At: {chat.updatedAt}")
            print(f"Last Used: {chat.lastUsed}")
            
            # Get users in this chat
            users = db.query(User).join(chat_users).filter(chat_users.c.chatId == chat.id).all()
            print(f"\n👥 Users in Chat ({len(users)}):")
            for user in users:
                print(f"  - User ID: {user.id}, Email: {user.email}, Name: {user.name}")
            
            # Get messages in this chat
            messages = db.query(ChatMessage).filter(ChatMessage.chatId == chat.id).order_by(ChatMessage.createdAt).all()
            print(f"\n💬 Messages in Chat ({len(messages)}):")
            for msg in messages:
                sender = db.query(User).filter(User.id == msg.userId).first()
                sender_name = sender.name if sender else f"User {msg.userId}"
                ai_marker = "🤖 [AI]" if msg.isAiGenerated else "👤 [User]"
                print(f"  {ai_marker} ID: {msg.id} | From: {sender_name} (ID: {msg.userId})")
                print(f"    Message: {msg.message[:100]}{'...' if len(msg.message) > 100 else ''}")
                print(f"    Created: {msg.createdAt}")
                print()
        
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_chat_data()
