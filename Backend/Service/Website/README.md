# Bingsu Backend Website

FastAPI backend application for Bingsu with PostgreSQL database.

## Setup

### 1. Install Python Dependencies

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Install Prisma (for database migrations)

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/bingsu_db"
JWT_SECRET_KEY="your-secret-key-change-this-in-production"
JWT_ISSUER="bingsu-api"
JWT_AUDIENCE="bingsu-client"
ENV="development"
ENABLE_GZIP="false"

# Qdrant (Vector Database for RAG)
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""  # Optional, for cloud Qdrant
QDRANT_COLLECTION="documents"
QDRANT_DISTANCE="Cosine"
QDRANT_TOP_K="6"

# Embeddings
EMBEDDING_PROVIDER="openai"  # or "gemini"
EMBEDDING_API_KEY="your-api-key"
EMBEDDING_MODEL="text-embedding-3-small"  # or "models/gemini-embedding-001"
EMBEDDING_BASE_URL="https://api.openai.com/v1"
EMBEDDING_BATCH_SIZE="32"
EMBEDDING_TIMEOUT_MS="10000"
```

### 4. Setup Database

Run Prisma migrations:

```bash
cd ../Database/Management
npm install
npm run db:migrate
```

Or push schema directly (development):

```bash
npm run db:push
```

### 5. Run Application

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
app/
├── main.py              # FastAPI application
├── database.py          # SQLAlchemy database setup
├── models.py            # SQLAlchemy models
├── dependencies.py      # FastAPI dependencies
├── routers/             # API routes
│   ├── health.py
│   ├── auth.py
│   ├── users.py
│   ├── chats.py
│   ├── chat_messages.py
│   └── credential.py
├── schemas/             # Pydantic schemas
│   ├── user.py
│   ├── credential.py
│   ├── chat.py
│   └── chat_message.py
└── utils/               # Utility functions
    ├── jwt.py
    ├── password.py
    └── verification.py
```

## Database Models

- **User**: User profile information
- **Credential**: Authentication credentials (separated for security)
- **Chat**: Multi-user chat rooms
- **ChatUser**: Junction table for chat membership
- **ChatMessage**: Messages in chat rooms

## Features

- ✅ JWT Authentication
- ✅ Password hashing (bcrypt, async)
- ✅ Rate limiting
- ✅ CORS middleware
- ✅ Request logging
- ✅ Email verification
- ✅ Password reset
- ✅ Multi-user chat rooms
- ✅ AI-generated message tracking

## Notes

- Database schema is managed by Prisma (see `../Database/Management/`)
- SQLAlchemy models are synchronized with Prisma schema
- Uses Int ID (autoincrement) for all tables
- User and Credential are separated tables
