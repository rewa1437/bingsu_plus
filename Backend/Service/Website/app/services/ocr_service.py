"""
OCR service client for FastAPI
Calls OCR service via HTTP API
"""
import os
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

# OCR service configuration
OCR_SERVICE_URL = os.getenv("OCR_SERVICE_URL", "http://localhost:8001").rstrip("/")
OCR_TIMEOUT = int(os.getenv("OCR_TIMEOUT_MS", "300000")) / 1000.0  # 5 minutes default


async def extract_text_from_file(
    file_content: bytes,
    filename: str,
    lang: str = "th",
    max_pages: int = 30,
    dpi: int = 200,
    use_angle_cls: bool = True
) -> Dict[str, Any]:
    """Extract text from file using OCR service"""
    try:
        async with httpx.AsyncClient(timeout=OCR_TIMEOUT) as client:
            files = {
                "file": (filename, file_content)
            }
            data = {
                "lang": lang,
                "max_pages": max_pages,
                "dpi": dpi,
                "use_angle_cls": use_angle_cls
            }
            
            response = await client.post(
                f"{OCR_SERVICE_URL}/api/ocr/extract",
                files=files,
                data=data
            )
            
            if not response.is_success:
                return {
                    "ok": False,
                    "error": f"OCR service error: HTTP {response.status_code}"
                }
            
            return response.json()
    except httpx.TimeoutException:
        return {
            "ok": False,
            "error": "OCR service timeout"
        }
    except Exception as e:
        return {
            "ok": False,
            "error": f"OCR service error: {type(e).__name__}"
        }
