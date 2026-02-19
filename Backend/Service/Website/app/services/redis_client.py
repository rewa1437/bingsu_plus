"""
Redis client for FastAPI
Used for rate limiting, caching, and queue management
"""
import os
from typing import Optional
from dotenv import load_dotenv

# Try to import redis, but handle gracefully if not installed
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

load_dotenv()

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL")
RATE_LIMIT_REDIS_PREFIX = os.getenv("RATE_LIMIT_REDIS_PREFIX", "rate")

# Global Redis client instance
_redis_client = None


def get_redis_client() -> Optional[any]:
    """Get Redis client instance (singleton)"""
    global _redis_client
    
    if not REDIS_AVAILABLE:
        return None
    
    if not REDIS_URL:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            # Test connection
            _redis_client.ping()
            print("✓ Redis connected successfully")
        except Exception as e:
            print(f"⚠️  Redis connection failed: {e}")
            _redis_client = None
    
    return _redis_client


def is_redis_ready() -> bool:
    """Check if Redis is ready and connected"""
    if not REDIS_AVAILABLE:
        return False
    client = get_redis_client()
    if not client:
        return False
    try:
        client.ping()
        return True
    except Exception:
        return False


def get_rate_limit_key(identifier: str) -> str:
    """Get rate limit key for Redis"""
    return f"{RATE_LIMIT_REDIS_PREFIX}:{identifier}"
