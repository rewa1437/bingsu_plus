"""
Redis-based rate limiter backend for slowapi
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Try to import redis, but handle gracefully if not installed
try:
    from app.services.redis_client import get_redis_client, is_redis_ready, REDIS_URL
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    REDIS_URL = None


def get_redis_limiter() -> Limiter:
    """Get rate limiter with Redis backend if available, otherwise memory-based"""
    if REDIS_AVAILABLE and is_redis_ready() and REDIS_URL:
        # slowapi supports Redis via storage_uri
        # Format: redis://localhost:6379/0
        try:
            return Limiter(
                key_func=get_remote_address,
                storage_uri=REDIS_URL,
                default_limits=["200/hour"]
            )
        except Exception as e:
            print(f"⚠️  Failed to initialize Redis limiter, falling back to memory: {e}")
            # Fallback to memory-based limiter
            return Limiter(
                key_func=get_remote_address,
                default_limits=["200/hour"]
            )
    else:
        # Fallback to memory-based limiter
        return Limiter(
            key_func=get_remote_address,
            default_limits=["200/hour"]
        )
