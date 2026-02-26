"""
Embeddings service for FastAPI
Supports OpenAI and Gemini providers
"""
import os
from typing import List, Optional
import httpx
from dotenv import load_dotenv
from app.utils.sanitize import sanitize_for_log

load_dotenv()

# Embeddings configuration
EMBEDDING_PROVIDER = (os.getenv("EMBEDDING_PROVIDER", "openai") or "openai").strip().lower()
EMBEDDING_BASE_URL = (os.getenv("EMBEDDING_BASE_URL", "https://api.openai.com/v1") or "https://api.openai.com/v1").rstrip("/")
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY", "")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL") or (
    "models/gemini-embedding-001" if EMBEDDING_PROVIDER == "gemini" else "text-embedding-3-small"
)
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))
EMBEDDING_TIMEOUT_MS = int(os.getenv("EMBEDDING_TIMEOUT_MS", "10000"))
EMBEDDING_CONNECT_TIMEOUT_MS = int(os.getenv("EMBEDDING_CONNECT_TIMEOUT_MS", "30000"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


async def embed_texts_openai(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using OpenAI-compatible API (supports OpenAI API or LLM Gateway)"""
    if not EMBEDDING_API_KEY:
        raise ValueError("Embedding API key is not configured")
    
    # Check if using placeholder API key (only check for obvious placeholders)
    placeholder_keys = ["your-api-key", "your-ope", "sk-placeholder", "your-openai-api-key", "sk-your"]
    key_lower = EMBEDDING_API_KEY.lower()
    if any(key_lower.startswith(placeholder) or key_lower == placeholder for placeholder in placeholder_keys):
        raise ValueError("Embedding API key is a placeholder — please configure a valid key")
    
    if not texts:
        return []
    
    timeout = httpx.Timeout(
        connect=EMBEDDING_CONNECT_TIMEOUT_MS / 1000.0,
        read=EMBEDDING_TIMEOUT_MS / 1000.0,
        write=EMBEDDING_TIMEOUT_MS / 1000.0,
        pool=EMBEDDING_CONNECT_TIMEOUT_MS / 1000.0
    )
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{EMBEDDING_BASE_URL}/embeddings",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {EMBEDDING_API_KEY}"
            },
            json={
                "model": EMBEDDING_MODEL,
                "input": texts,
                "encoding_format": "float"
            }
        )
        
        if not response.is_success:
            error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
            error_detail = error_data.get("error", {}) if isinstance(error_data.get("error"), dict) else {}
            error_msg = error_detail.get("message", response.text) or f"HTTP {response.status_code}"
            
            # Log sanitized error for debugging
            is_gateway = "aigateway" in EMBEDDING_BASE_URL.lower() or "gateway" in EMBEDDING_BASE_URL.lower()
            api_name = "LLM Gateway" if is_gateway else "OpenAI API"
            print(f"❌ {api_name} error: Status {response.status_code}")
            print(f"   Error message: {sanitize_for_log(error_msg)}")
            
            # Raise sanitized error messages (no API keys, no internal paths)
            if response.status_code == 401:
                raise Exception(f"{api_name} authentication failed (401)")
            elif "incorrect api key" in error_msg.lower() or "invalid api key" in error_msg.lower() or "invalid_api_key" in error_msg.lower():
                raise Exception(f"{api_name} authentication failed — invalid key")
            elif "insufficient_quota" in error_msg.lower() or "quota" in error_msg.lower():
                raise Exception(f"{api_name} quota exceeded")
            
            raise Exception(f"Embedding error ({api_name}): HTTP {response.status_code}")
        
        data = response.json().get("data", [])
        if len(data) != len(texts):
            raise Exception("Embedding response size mismatch")
        
        return [
            [float(v) for v in item.get("embedding", [])]
            for item in data
        ]


async def embed_texts_gemini(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using Gemini"""
    if not GEMINI_API_KEY:
        raise ValueError("Gemini API key is not configured")
    
    if not texts:
        return []
    
    try:
        from google import genai
    except ImportError:
        raise ImportError("google-genai package is required for Gemini embeddings. Install with: pip install google-genai")
    
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    vectors = []
    batch_size = EMBEDDING_BATCH_SIZE
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        try:
            response = await client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=batch
            )
            embeddings = response.embeddings or []
            if len(embeddings) != len(batch):
                raise Exception("Embedding response size mismatch")
            
            for item in embeddings:
                values = item.values if hasattr(item, 'values') else []
                vectors.append([float(v) for v in values])
        except Exception as e:
            raise Exception(f"Gemini embedding failed: {sanitize_for_log(str(e))}")
    
    return vectors


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for texts using configured provider"""
    provider = EMBEDDING_PROVIDER
    
    if provider == "openai":
        return await embed_texts_openai(texts)
    elif provider == "gemini":
        return await embed_texts_gemini(texts)
    else:
        raise ValueError(f'Unsupported embedding provider. Use "openai" or "gemini".')
