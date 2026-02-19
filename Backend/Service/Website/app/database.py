"""
Database configuration using SQLAlchemy
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    error_msg = (
        "DATABASE_URL environment variable is not set.\n\n"
        "Please create a .env file in the bingsu/Backend/Website directory with the following content:\n\n"
        "DATABASE_URL=\"postgresql://username:password@localhost:5432/database_name\"\n\n"
        "See README.md for more details."
    )
    raise ValueError(error_msg)

# Remove ?schema=public from DATABASE_URL (psycopg3 doesn't support schema parameter)
# Schema should be specified in SQLAlchemy models or queries, not in connection string
if "?schema=" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

# Convert postgresql:// to postgresql+psycopg:// if using psycopg (psycopg3)
# This ensures compatibility with Python 3.13
if DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+psycopg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Create engine with connection pool settings for high concurrency
# pool_size: Number of connections to keep open (default: 5)
# max_overflow: Additional connections beyond pool_size (default: 10)
# pool_pre_ping: Verify connections before using (prevents stale connections)
# pool_recycle: Recycle connections after this many seconds (default: 3600)
engine = create_engine(
    DATABASE_URL,
    pool_size=25,           # Base pool size (connections always available)
    max_overflow=75,        # Additional connections when pool is exhausted
    pool_pre_ping=True,     # Verify connections before using (important for long-running apps)
    pool_recycle=3600,      # Recycle connections after 1 hour
    echo=False              # Set to True for SQL query logging (debug only)
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# Dependency for FastAPI
def get_db():
    """Database session dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
