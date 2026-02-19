"""
FastAPI application main file for Bingsu Backend
"""
import logging
import time
import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from dotenv import load_dotenv
import os
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import database
from app.database import engine, Base

# Import routers
from app.routers import health, users, chats, chat_messages, auth, credential, bots, documents, database

# Load environment variables
load_dotenv()

# Create tables (with error handling)
try:
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created/verified successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not create database tables: {e}")
    print("   Make sure PostgreSQL is running and DATABASE_URL is correct")

# Initialize rate limiter (with Redis backend if available)
from app.utils.redis_rate_limiter import get_redis_limiter
limiter = get_redis_limiter()

# Initialize FastAPI app
app = FastAPI(
    title="Bingsu Backend API",
    version="1.0.0",
    description="FastAPI Backend with PostgreSQL - Combined best practices"
)

# Add rate limiter to app
app.state.limiter = limiter

# Custom rate limit exception handler with Thai message
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceptions with user-friendly Thai message"""
    response = JSONResponse(
        status_code=429,
        content={
            "detail": "คุณพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง"
        }
    )
    origin = request.headers.get("origin")
    if is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    if hasattr(exc, 'retry_after') and exc.retry_after:
        response.headers["Retry-After"] = str(exc.retry_after)
    return response

# Setup logging
app_logger = logging.getLogger("app")
root_logger = logging.getLogger()

# Helper function to check if origin is allowed
def is_allowed_origin(origin: str) -> bool:
    """Check if origin is allowed (localhost, 127.0.0.1, or local network IP)"""
    if not origin:
        return False
    
    allowed_exact = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    if origin in allowed_exact:
        return True
    
    local_network_pattern = r"^http://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+):(3000|3001|8000)$"
    if re.match(local_network_pattern, origin):
        return True
    
    return False

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"http://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+):(3000|3001|8000)",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# GZip compression middleware
env_mode = os.getenv("ENV", "development").lower()
enable_gzip = os.getenv("ENABLE_GZIP", "true" if env_mode == "production" else "false").lower() == "true"
if enable_gzip:
    app.add_middleware(GZipMiddleware, minimum_size=20000)

# Exception handlers to ensure CORS headers are added even on errors
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with CORS headers"""
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    origin = request.headers.get("origin")
    if is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions with CORS headers"""
    # Don't catch HTTPException - let it be handled by StarletteHTTPException handler
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        raise exc
    
    app_logger.error(f"Unhandled exception: {exc}", exc_info=True)
    # In development, show more details
    env_mode = os.getenv("ENV", "development").lower()
    detail = "Internal server error"
    if env_mode == "development":
        detail = f"Internal server error: {type(exc).__name__}: {str(exc)}"
    
    response = JSONResponse(
        status_code=500,
        content={"detail": detail}
    )
    origin = request.headers.get("origin")
    if is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests"""
    start_time = time.time()
    
    try:
        response = await call_next(request)
        
        origin = request.headers.get("origin")
        if origin and is_allowed_origin(origin):
            if "Access-Control-Allow-Origin" not in response.headers:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
        
        process_time = time.time() - start_time
        
        if process_time > 1.0 or response.status_code >= 400:
            app_logger.info(
                f"{request.method} {request.url.path} - "
                f"Status: {response.status_code} - "
                f"Time: {process_time:.3f}s - "
                f"Client: {request.client.host if request.client else 'unknown'}"
            )
        
        return response
    except Exception as e:
        app_logger.error(f"Error processing request: {e}", exc_info=True)
        raise

# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(credential.router)
app.include_router(chats.router)
app.include_router(chat_messages.router)
app.include_router(bots.router)
app.include_router(documents.router)
app.include_router(database.router)

# Initialize rate limiter for auth router
from app.routers import auth as auth_router
auth_router.limiter.state = limiter
