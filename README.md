# Bingsu

Full-stack application with AI-powered chat, document management, and RAG capabilities.

## 📁 Project Structure

```
bingsu/
├── Backend/          # Backend services and databases
│   ├── Database/     # Database services (PostgreSQL, Qdrant, Redis)
│   └── Service/      # Application services (Website, RAG, OCR, etc.)
├── Frontend/         # Frontend applications
│   ├── User/         # User-facing React app
│   └── Supportadmin/ # Admin/Support dashboard
└── ARCHITECTURE.md   # System architecture documentation
```

## 🚀 Quick Start

**📖 สำหรับคู่มือการรันแบบละเอียด ดูที่ [RUN.md](RUN.md)**

### Prerequisites

- Node.js 20+
- Python 3.10+
- Docker Desktop
- PostgreSQL, Qdrant, Redis (via Docker)

### 1. Environment Setup

```bash
# Copy environment template
cp env.example .env.local

# Edit with your configuration
nano .env.local
```

### 2. Start Databases

```bash
cd Backend/Database/Management
docker compose up -d
```

### 3. Setup Backend

```bash
# Install dependencies
cd Backend/Service/Website
pip install -r requirements.txt

# Setup PostgreSQL schema
cd ../../Database/PostgreSQL
npm install
npx prisma generate
npx prisma migrate dev
```

### 4. Start Backend Services

```bash
# Start FastAPI (Website)
cd Backend/Service/Website
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start OCR Service (optional)
cd Backend/Service/Ocr
uvicorn ocr:app --host 0.0.0.0 --port 8001 --reload
```

### 5. Start Frontend

```bash
cd Frontend/User
npm install
npm start
```

## 📚 Documentation

- **Run Guide**: See [RUN.md](RUN.md) for detailed run instructions
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md) for system architecture
- **Backend**: See [Backend/README.md](Backend/README.md) for backend documentation
- **Frontend**: See [Frontend/User/README.md](Frontend/User/README.md) for frontend documentation

## 🔧 Configuration

All configuration is done via environment variables. See `env.example` for all available options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `QDRANT_URL` - Qdrant vector database URL
- `REDIS_URL` - Redis connection string
- `JWT_SECRET_KEY` - Secret key for JWT tokens
- `EMBEDDING_PROVIDER` - "openai" or "gemini"
- `OCR_API_URL` - OCR service URL

## 🏗️ Architecture

### Backend Services

- **Website** (FastAPI) - Main API gateway
- **RAG** - Retrieval-Augmented Generation service
- **Embedded** - Embeddings service (OpenAI/Gemini)
- **OCR** - Optical Character Recognition service
- **Redis** - Cache and queue service
- **nginx** - Reverse proxy configuration

### Databases

- **PostgreSQL** - Relational database (users, chats, messages)
- **Qdrant** - Vector database (embeddings, similarity search)
- **Redis** - Cache and queue (sessions, rate limiting)

## 🧪 Development

### Running Tests

```bash
# Test Qdrant
cd Backend/Database/Qdrant
npm test

# Test Backend API
cd Backend/Service/Website
pytest  # If tests are available
```

### Database Migrations

```bash
cd Backend/Database/PostgreSQL
npx prisma migrate dev
```

## 📦 Deployment

See individual service READMEs for deployment instructions.

## 📄 License

[Your License Here]

## 🤝 Contributing

[Contributing guidelines]
