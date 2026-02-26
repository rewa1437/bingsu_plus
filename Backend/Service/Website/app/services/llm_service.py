"""
LLM (Large Language Model) service for generating AI responses
"""
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import openai
from openai import AsyncOpenAI
from app.utils.sanitize import sanitize_for_log, safe_error_for_user

# Load .env from root directory (bingsu/.env)
env_path = Path(__file__).parent.parent.parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    # Fallback to default load_dotenv
    load_dotenv()

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
# ใช้ GATEWAY_BASE_URL ถ้ามี (สำหรับ AI Gateway) หรือ OPENAI_BASE_URL
GATEWAY_BASE_URL = os.getenv("GATEWAY_BASE_URL")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL") or GATEWAY_BASE_URL

# Initialize OpenAI client
client = None
if OPENAI_API_KEY:
    client_kwargs = {"api_key": OPENAI_API_KEY}
    if OPENAI_BASE_URL:
        client_kwargs["base_url"] = OPENAI_BASE_URL
    try:
        client = AsyncOpenAI(**client_kwargs)
        print(f"✅ LLM Service initialized with model: {OPENAI_MODEL}")
        if OPENAI_BASE_URL:
            print(f"   Using custom base URL")
        else:
            print(f"   Using default OpenAI API")
    except Exception as e:
        print(f"⚠️ Error initializing OpenAI client: {sanitize_for_log(str(e))}")
else:
    print("⚠️ OPENAI_API_KEY not found in environment variables")


async def generate_response(
    user_message: str,
    system_prompt: Optional[str] = None,
    context_chunks: Optional[List[Dict[str, Any]]] = None,
    model: Optional[str] = None
) -> str:
    """
    Generate AI response using OpenAI LLM
    
    Args:
        user_message: The user's message
        system_prompt: System prompt for the bot (optional)
        context_chunks: List of context chunks from RAG (optional)
        model: Model to use (defaults to OPENAI_MODEL)
    
    Returns:
        Generated response string
    """
    if not client:
        return "⚠️ ระบบ AI ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ"
    
    # ใช้ model ที่ส่งมา หรือ default model
    # ถ้า model เป็น "MATCHA AI" หรือชื่ออื่นที่ไม่ใช่ model จริง ให้ใช้ default model
    model_to_use = model or OPENAI_MODEL
    
    # แปลง "MATCHA AI" หรือชื่อ display name อื่นๆ เป็น model จริง
    if model_to_use and model_to_use.upper() in ["MATCHA AI", "MATCHA", "MATCHA_AI"]:
        model_to_use = OPENAI_MODEL  # ใช้ default model (gpt-4o-mini)
    
    # ตรวจสอบว่า model เป็น model ที่ถูกต้อง (ต้องเป็น gpt-4o-mini หรือ model ที่ API key อนุญาต)
    # ถ้าไม่ใช่ model ที่รู้จัก ให้ใช้ default model
    valid_models = ["gpt-4o-mini", "gpt-4o", "gpt-4", "gpt-3.5-turbo"]
    if model_to_use and not any(model_to_use.lower().startswith(valid.lower()) for valid in valid_models):
        print(f"⚠️ Model '{model_to_use}' is not a valid OpenAI model, using default: {OPENAI_MODEL}")
        model_to_use = OPENAI_MODEL
    
    # Build messages
    messages = []
    
    # Build system prompt with strict instructions
    strict_instruction = """คุณเป็น AI assistant ที่ต้องตอบคำถามโดยใช้เฉพาะข้อมูลจาก Knowledge Base ที่ให้มาเท่านั้น

กฎสำคัญ:
1. ตอบเฉพาะข้อมูลที่มีใน Context from Knowledge Base เท่านั้น
2. ห้ามใช้ความรู้ทั่วไปหรือข้อมูลจากภายนอก
3. ห้ามตอบคำถามที่ไม่มีข้อมูลใน Knowledge Base
4. ถ้าไม่มีข้อมูลใน Knowledge Base ที่เกี่ยวข้องกับคำถาม ให้ตอบว่า "ขออภัย ไม่พบข้อมูลที่เกี่ยวข้องกับคำถามของคุณใน Knowledge Base"
5. ถ้าข้อมูลใน Knowledge Base ไม่เพียงพอที่จะตอบคำถามได้ครบถ้วน ให้บอกว่า "ข้อมูลที่มีใน Knowledge Base ไม่เพียงพอที่จะตอบคำถามนี้ได้ครบถ้วน"
6. ใช้เฉพาะข้อความและข้อมูลที่ระบุใน Context เท่านั้น"""

    if system_prompt:
        # Combine user's system prompt with strict instructions
        full_system_prompt = f"{system_prompt}\n\n{strict_instruction}"
        messages.append({
            "role": "system",
            "content": full_system_prompt
        })
    else:
        messages.append({
            "role": "system",
            "content": strict_instruction
        })
    
    # Add context from RAG if available
    if context_chunks and len(context_chunks) > 0:
        print(f"📚 Adding {len(context_chunks)} context chunks to LLM prompt")
        context_text = "\n\n=== Context from Knowledge Base (ใช้เฉพาะข้อมูลนี้เท่านั้น) ===\n\n"
        for i, chunk in enumerate(context_chunks, 1):
            chunk_text = chunk.get("text", "")
            chunk_title = chunk.get("title", "")
            if chunk_text:
                context_text += f"[Context {i}"
                if chunk_title:
                    context_text += f" from: {chunk_title}"
                context_text += f"]\n{chunk_text}\n\n"
        context_text += "=== สิ้นสุด Context ===\n\n"
        
        # Add context and user message
        messages.append({
            "role": "user",
            "content": f"{context_text}คำถาม: {user_message}\n\nคำแนะนำ: ตอบโดยใช้เฉพาะข้อมูลจาก Context ด้านบนเท่านั้น ห้ามใช้ความรู้ทั่วไป"
        })
        print(f"✅ Context added to prompt (total length: {len(context_text)} chars)")
    else:
        # No context - should not happen if document_ids provided, but handle it
        print("⚠️ No context chunks provided")
        messages.append({
            "role": "user",
            "content": f"คำถาม: {user_message}\n\nคำแนะนำ: เนื่องจากไม่มีข้อมูลใน Knowledge Base ที่เกี่ยวข้องกับคำถามนี้ กรุณาตอบว่า 'ขออภัย ไม่พบข้อมูลที่เกี่ยวข้องกับคำถามของคุณใน Knowledge Base'"
        })
    
    try:
        response = await client.chat.completions.create(
            model=model_to_use,
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        
        if response.choices and len(response.choices) > 0:
            return response.choices[0].message.content.strip()
        else:
            return "⚠️ No response generated from AI."
    
    except Exception as e:
        print(f"⚠️ Error generating AI response: {sanitize_for_log(str(e))}")
        return safe_error_for_user(e, "เกิดข้อผิดพลาดในการสร้างคำตอบ")
