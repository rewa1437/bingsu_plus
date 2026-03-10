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
OPENAI_MODEL = os.getenv("OPENAI_MODEL")
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
    
    # ตรวจจับว่ามีหลายคำถามหรือไม่ (นับเครื่องหมายคำถามและคำถาม)
    question_marks = ['?', '？']
    question_words = ['อะไร', 'อย่างไร', 'เมื่อไหร่', 'ที่ไหน', 'ใคร', 'ทำไม', 'หรือไม่']
    
    # นับเครื่องหมายคำถาม
    question_mark_count = sum(1 for char in user_message if char in question_marks)
    # นับคำถาม (คำที่ขึ้นต้นด้วยคำถาม)
    question_word_count = sum(1 for word in question_words if word in user_message)
    # นับบรรทัดใหม่ (อาจบ่งบอกหลายคำถาม)
    newline_count = user_message.count('\n')
    
    # ถือว่ามีหลายคำถามถ้า: มีเครื่องหมายคำถาม >= 2 หรือมีคำถาม >= 2 หรือมีหลายบรรทัด
    has_multiple_questions = question_mark_count >= 2 or question_word_count >= 2 or (newline_count >= 2 and question_mark_count >= 1)
    
    if has_multiple_questions:
        print(f"📝 ตรวจจับหลายคำถาม (เครื่องหมาย: {question_mark_count}, คำถาม: {question_word_count}, บรรทัด: {newline_count}) - จะใช้คำตอบแบบกระชับ")
    
    # Build messages
    messages = []
    
    # เพิ่มคำแนะนำสำหรับหลายคำถาม
    conciseness_instruction = ""
    if has_multiple_questions:
        conciseness_instruction = """
    
    === คำแนะนำพิเศษสำหรับหลายคำถาม ===
    - ตอบแต่ละคำถามอย่างกระชับและตรงประเด็น
    - ใช้ประโยคสั้นๆ ไม่ต้องอธิบายยาว
    - หากมีหลายคำถาม ให้แยกคำตอบด้วยการขึ้นบรรทัดใหม่
    - จำกัดความยาวคำตอบทั้งหมดไม่เกิน 500 คำ
    - เน้นข้อมูลสำคัญเท่านั้น ไม่ต้องรายละเอียดย่อย
    
    """
    
    strict_instruction = f"""
    คุณเป็น AI Assistant ที่ทำงานในระบบ Retrieval-Augmented Generation (RAG)
    และต้องตอบคำถามโดยใช้เฉพาะข้อมูลจาก Context from Knowledge Base ที่ให้มาเท่านั้น

    === บทบาท ===
    - ใช้ข้อมูลจาก Context เท่านั้น
    - ห้ามใช้ความรู้ทั่วไปหรือข้อมูลภายนอก
    - ห้ามคาดเดา ห้ามเติมข้อมูลเอง

    === กฎสำคัญ ===
    1. ตอบโดยอ้างอิงเฉพาะข้อมูลที่ปรากฏใน Context เท่านั้น
    2. ต้องระบุแหล่งที่มาโดยอ้างอิงเป็น [DocX] หรือ Source ID ที่ให้มา
    3. หากไม่มีข้อมูลที่เกี่ยวข้อง ให้ตอบว่า:
    ขออภัย ไม่พบข้อมูลที่เกี่ยวข้องกับคำถามของคุณใน Knowledge Base
    4. หากข้อมูลไม่เพียงพอ ให้ตอบว่า:
    ข้อมูลที่มีใน Knowledge Base ไม่เพียงพอที่จะตอบคำถามนี้ได้ครบถ้วน
    5. หากมีหลายเอกสาร:
    ให้สังเคราะห์คำตอบจากทุกเอกสารที่เกี่ยวข้อง
    และระบุแหล่งที่มาทุกจุด
    6. หากข้อมูลขัดแย้งกัน:
    ให้ระบุความขัดแย้ง และแสดงข้อมูลจากแต่ละเอกสารแยกกัน
    7. ห้ามแก้ไขตัวเลข วันที่ หรือ technical term
    8. ห้ามสร้างแหล่งอ้างอิงปลอม
    9. ห้ามใช้ Markdown ทุกรูปแบบ เช่น **, *, #, -, bullet, heading
    10. ห้ามตกแต่งข้อความ ห้ามเน้นตัวหนา ห้ามใช้สัญลักษณ์พิเศษ
    11. ตอบเป็น Plain Text เท่านั้น
    12. ตอบอย่างกระชับ ตรงประเด็น ไม่ต้องอธิบายยาว
    13. จำกัดความยาวคำตอบให้เหมาะสม ไม่เกิน 800 คำ
    {conciseness_instruction}
    """
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
    
    # กำหนด max_tokens ตามจำนวนคำถาม (ลดลงเมื่อมีหลายคำถาม)
    if has_multiple_questions:
        max_tokens = 1000  # ลดลงเมื่อมีหลายคำถาม
    else:
        max_tokens = 1200  # ลดจาก 2000 เป็น 1200 สำหรับคำถามเดียว
    
    try:
        response = await client.chat.completions.create(
            model=model_to_use,
            messages=messages,
            temperature=0.7,
            max_tokens=max_tokens
        )
        
        if response.choices and len(response.choices) > 0:
            return response.choices[0].message.content.strip()
        else:
            return "⚠️ No response generated from AI."
    
    except Exception as e:
        print(f"⚠️ Error generating AI response: {sanitize_for_log(str(e))}")
        return safe_error_for_user(e, "เกิดข้อผิดพลาดในการสร้างคำตอบ")
