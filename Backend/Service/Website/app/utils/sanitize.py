"""
Error message sanitization utilities
Prevents leaking sensitive data (API keys, internal paths, env vars) in logs and responses
"""
import re


# Regex patterns for sensitive data
_SENSITIVE_PATTERNS = [
    # API keys: sk-proj-..., sk-..., key-...
    (re.compile(r'(sk-[a-zA-Z0-9_-]{2,})[a-zA-Z0-9_*-]{4,}'), r'\1***'),
    # Generic long tokens/keys (40+ alphanumeric chars)
    (re.compile(r'(?<=[:\s"\'])[A-Za-z0-9_-]{40,}(?=["\'\s,;.]|$)'), '***REDACTED***'),
    # Bearer tokens in messages
    (re.compile(r'(Bearer\s+)[A-Za-z0-9._-]+', re.IGNORECASE), r'\1***'),
    # API key provided: <value>
    (re.compile(r'(API key provided:\s*)\S+', re.IGNORECASE), r'\1***'),
    # password=... or api_key=...
    (re.compile(r'((?:password|api_key|secret|token|apikey|api-key)[\s]*[=:]\s*)\S+', re.IGNORECASE), r'\1***'),
]

# Phrases that reveal internal configuration
_INTERNAL_PHRASES = [
    (re.compile(r'ในไฟล์\s*\.env', re.IGNORECASE), ''),
    (re.compile(r'in your \.env file', re.IGNORECASE), ''),
    (re.compile(r'in \.env', re.IGNORECASE), ''),
    (re.compile(r'Please set [A-Z_]+ in', re.IGNORECASE), 'กรุณาติดต่อผู้ดูแลระบบ'),
    (re.compile(r'You can find your API key at https?://\S+', re.IGNORECASE), ''),
]


def sanitize_for_log(error_msg: str) -> str:
    """
    Sanitize error message for server-side logging.
    Masks API keys and tokens but keeps other debug info.
    """
    if not isinstance(error_msg, str):
        error_msg = str(error_msg)

    result = error_msg
    for pattern, replacement in _SENSITIVE_PATTERNS:
        result = pattern.sub(replacement, result)
    return result


def sanitize_for_user(error_msg: str) -> str:
    """
    Sanitize error message for user-facing responses.
    Removes API keys, internal config references, and sensitive details.
    """
    if not isinstance(error_msg, str):
        error_msg = str(error_msg)

    result = error_msg
    # First strip sensitive data
    for pattern, replacement in _SENSITIVE_PATTERNS:
        result = pattern.sub(replacement, result)
    # Then strip internal config references
    for pattern, replacement in _INTERNAL_PHRASES:
        result = pattern.sub(replacement, result)
    # Clean up double spaces
    result = re.sub(r'  +', ' ', result).strip()
    return result


def safe_error_for_user(error: Exception, generic_msg: str = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง") -> str:
    """
    Return a safe error message for the user.
    In most cases, just return the generic message.
    Only include details for known safe error types.
    """
    error_str = str(error).lower()

    # Map known error types to safe user messages
    if "401" in error_str or "invalid_api_key" in error_str or "incorrect api key" in error_str:
        return "⚠️ ระบบ AI ขัดข้อง กรุณาติดต่อผู้ดูแลระบบ"
    elif "429" in error_str or "rate_limit" in error_str:
        return "⚠️ มีการใช้งานมากเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง"
    elif "timeout" in error_str:
        return "⚠️ การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง"
    elif "connection" in error_str or "connect" in error_str:
        return "⚠️ ไม่สามารถเชื่อมต่อบริการได้ กรุณาลองใหม่ภายหลัง"
    elif "quota" in error_str or "insufficient" in error_str:
        return "⚠️ ระบบ AI ไม่สามารถให้บริการได้ชั่วคราว กรุณาติดต่อผู้ดูแลระบบ"
    else:
        return f"⚠️ {generic_msg}"
