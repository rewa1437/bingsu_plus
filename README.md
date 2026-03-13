# บิงซูบอท (bb) — Ask AA

ระบบ RAG Chatbot สำหรับสร้างบอทจากชุดความรู้ (Knowledge) รองรับการอัปโหลดเอกสาร, Embedding และแชทกับ AI

---

## สารบัญ

- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [สิ่งที่ต้องเตรียม](#สิ่งที่ต้องเตรียม)
- [วิธีที่ 1: ติดตั้งด้วย Docker (แนะนำ)](#วิธีที่-1-ติดตั้งด้วย-docker-แนะนำ)
- [วิธีที่ 2: ติดตั้งแบบ Local](#วิธีที่-2-ติดตั้งแบบ-local)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [แก้ปัญหาเบื้องต้น](#แก้ปัญหาเบื้องต้น)

---

## ภาพรวมระบบ

| ส่วน | คำอธิบาย |
|------|----------|
| **Frontend (User)** | หน้าเว็บสำหรับผู้ใช้ — Login, Knowledge, Bots, Chat |
| **Frontend (Supportadmin)** | หน้าเว็บสำหรับแอดมิน/ซัพพอร์ต |
| **Backend (Legacy)** | Node/Express — Auth, Documents, Bots, Chat, Upload |
| **Database** | PostgreSQL (ผู้ใช้, Knowledge, Bots, บทสนทนา) |
| **Queue** | Redis (คิวอัปโหลดและประมวลผลเอกสาร) |
| **Vector DB** | Qdrant (เก็บ Embeddings สำหรับ RAG) |

```
┌──────────────────┐         ┌─────────────────┐
│  Web (User)      │   API   │  Legacy (Node)  │
│  :8083           │ ──────► │  :5052          │
└──────────────────┘         └────────┬────────┘
         │                             │
┌────────┴────────┐                    │
│ Supportadmin    │                    │
│ :3014           │                    ▼
└─────────────────┘         ┌─────────────────────┐
                             │ Postgres, Redis,    │
                             │ Qdrant              │
                             └─────────────────────┘
```

---

## สิ่งที่ต้องเตรียม

| สิ่งที่ต้องมี | เวอร์ชันที่แนะนำ | ใช้ทำอะไร |
|---------------|------------------|-----------|
| **Docker** (ถ้ารันแบบ Docker) | ล่าสุด | รันทั้ง stack ใน container |
| **Node.js** (ถ้ารันแบบ Local) | 20 ขึ้นไป | Backend + Frontend |
| **Git** | ล่าสุด | โคลนโปรเจกต์ |

---

## วิธีที่ 1: ติดตั้งด้วย Docker (แนะนำ)

รันทุกอย่างใน Docker — ไม่ต้องติดตั้ง Node/PostgreSQL แยก

### ขั้นตอน

**1. เข้าโฟลเดอร์โปรเจกต์ (bb)**

```bash
cd bb
```

*(ถ้าโคลน repo แล้วอยู่ที่ root: `cd ask_AA/bb` หรือ `cd bb` ตามที่โคลนมา)*

**2. สร้างไฟล์ `.env` สำหรับ Backend**

ไฟล์ `Backend/env.sample` เป็นเทมเพลต **ไม่มี API key หรือรหัสลับ** — ปลอดภัยต่อการ commit  
ให้ copy ไปเป็น `Backend/.env` แล้วเติมค่าจริงใน `.env` เท่านั้น

**Windows (PowerShell):**
```powershell
copy Backend\env.sample Backend\.env
```

**macOS / Linux:**
```bash
cp Backend/env.sample Backend/.env
```

**3. ตั้งค่าใน `Backend/.env`**

เปิด `Backend/.env` แล้วใส่ค่าที่จำเป็น เช่น

- `OPENAI_API_KEY` หรือ `GEMINI_API_KEY` (สำหรับแชท)
- `EMBEDDING_API_KEY`, `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL` (สำหรับ embedding)
- ถ้าใช้ Typhoon OCR: `TYPHOON_OCR_API_KEY`
- ค่าอื่น (DB, Redis, Qdrant, port) ใช้จาก `env.sample` ได้ — ใน Docker ค่า DB/Redis/Qdrant ถูก override ให้เชื่อมกับ container อยู่แล้ว

**4. รันทั้งระบบ**

```bash
docker compose up -d --build
```

รอ build และรันครั้งแรกสักครู่

**5. เปิดใช้งาน**

| URL | การใช้งาน |
|-----|------------|
| **http://localhost:8083** | หน้าเว็บผู้ใช้ (User) |
| **http://localhost:3014** | หน้าแอดมิน (Supportadmin) |
| **http://localhost:5052** | API (Legacy Backend) |

**6. (ครั้งแรกเท่านั้น) สร้าง user แอดมิน**

```bash
docker compose exec legacy node server/scripts/seed-admins.js
```

จากนั้นล็อกอิน Supportadmin ด้วยบัญชีที่ seed (เช่น `admin@admin.com` / `admin1234`)

(ถ้าต้องการ) สร้างบอทช่วยสอน:

```bash
docker compose exec legacy node server/scripts/seed-help-bot.js
```

### คำสั่งที่ใช้บ่อย (Docker)

| คำสั่ง | ความหมาย |
|--------|----------|
| `docker compose up -d --build` | รันทั้ง stack (รวม build ใหม่) |
| `docker compose down` | ปิด stack |
| `docker compose logs -f` | ดู log แบบต่อเนื่อง |

### พอร์ตที่ใช้

| Service | พอร์ต |
|---------|--------|
| Web (User) | 8083 |
| Supportadmin | 3014 |
| Backend (Legacy API) | 5052 |
| Postgres | 5436 |
| Redis | 6382 |
| Qdrant | 6336 |

### กรณีพอร์ต 80 หรือ 8083 ถูกใช้อยู่

ถ้าต้องการรัน web ที่พอร์ตอื่น (เช่น 8082):

```bash
docker compose -f Docker-compose.yml -f docker-compose.port8080.yml up -d web
```

แล้วเปิด **http://localhost:8082** (ตามที่ตั้งใน `docker-compose.port8080.yml`)

---

## วิธีที่ 2: ติดตั้งแบบ Local

เหมาะกับคนที่ต้องการพัฒนา/ดีบัก โดยรัน Backend และ Frontend บนเครื่อง แล้วใช้ Docker เฉพาะ Postgres, Redis, Qdrant

### ขั้นที่ 1 — เข้าโฟลเดอร์ bb และรัน Infrastructure

```bash
cd bb
docker compose up -d postgres redis qdrant
```

ตรวจสอบว่า container ทำงาน:

```bash
docker ps
```

| Service | พอร์ต |
|---------|--------|
| Postgres | 5436 |
| Redis | 6382 |
| Qdrant | 6336 |

### ขั้นที่ 2 — ตั้งค่า Backend (.env.local)

ที่โฟลเดอร์ `Backend` — ใช้ `env.sample` เป็นเทมเพลต (ไม่มี key ในไฟล์ sample):

```bash
cd Backend
```

**Windows:**
```powershell
copy env.sample .env.local
```

**macOS / Linux:**
```bash
cp env.sample .env.local
```

เปิด `Backend/.env.local` แล้วเติมค่าจริงอย่างน้อย:

| ตัวแปร | ความหมาย | ตัวอย่าง (Local) |
|--------|----------|------------------|
| `DATABASE_URL` | เชื่อมต่อ Postgres | `postgresql://postgres:postgres@localhost:5436/ask_the_manual?schema=public` |
| `REDIS_URL` | เชื่อมต่อ Redis | `redis://localhost:6382` |
| `QDRANT_URL` | เชื่อมต่อ Qdrant | `http://localhost:6336` |
| `CORS_ORIGINS` | อนุญาต Frontend | `http://localhost:3000,http://localhost:8083` |
| `OPENAI_API_KEY` | คีย์แชท | คีย์จาก OpenAI หรือ gateway |
| `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL` | Embedding | ตามที่ใช้ (เช่น openai, gemini) |

### ขั้นที่ 3 — ติดตั้ง Backend และ Database

ยังอยู่ที่โฟลเดอร์ `Backend`:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
```

(ถ้าต้องการ) สร้าง user แอดมินและบอทช่วยสอน:

```bash
npm run seed:admins
npm run seed:help-bot
```

### ขั้นที่ 4 — รัน Backend (Legacy)

ที่โฟลเดอร์ `Backend`:

```bash
npm run dev:legacy
```

Backend จะรันที่ **http://localhost:5052**

### ขั้นที่ 5 — ตั้งค่าและรัน Frontend (User)

เปิด Terminal อีกอัน:

```bash
cd bb/Frontend/User
```

สร้าง `.env` จากตัวอย่างที่โฟลเดอร์ bb:

**Windows:**
```powershell
copy ..\..\.env.example .env
```

**macOS / Linux:**
```bash
cp ../../.env.example .env
```

ในโหมดพัฒนา ตั้ง `REACT_APP_API_BASE_URL=http://localhost:5052` (หรือใช้ proxy ถ้ามีในโปรเจกต์)

ติดตั้งและรัน:

```bash
npm install
npm start
```

เบราว์เซอร์จะเปิดที่ **http://localhost:3000**

### ขั้นที่ 6 — (ถ้าต้องใช้) รัน Frontend Supportadmin

ที่โฟลเดอร์ `Frontend/Supportadmin` ตั้ง API base URL ไปที่ `http://localhost:5052` แล้วรัน:

```bash
cd bb/Frontend/Supportadmin
npm install
npm start
```

(พอร์ตอาจเป็น 3001 ถ้า 3000 ถูกใช้แล้ว)

### สรุป URL (Local)

| URL | การใช้งาน |
|-----|------------|
| http://localhost:3000 | หน้าเว็บผู้ใช้ (User) |
| http://localhost:5052 | API (Backend) |

---

## โครงสร้างโปรเจกต์

```
bb/
├── README.md                 ← คู่มือนี้
├── .env.example              ← ตัวอย่าง env สำหรับ Frontend (ไม่มี key)
├── Docker-compose.yml        ← รันทั้ง stack ด้วย Docker
├── docker-compose.port8080.yml  ← ใช้เมื่อพอร์ต 80/8083 ถูกใช้
├── Dockerfile.web            ← Build Frontend User + nginx
├── Backend/                  ← Node/Express (Legacy)
│   ├── env.sample            ← เทมเพลต .env (ไม่มี API key — copy ไปเป็น .env แล้วเติมค่าจริง)
│   ├── .env / .env.local     ← ค่าจริง (ไม่ commit)
│   ├── server/               ← Auth, Documents, Bots, Chat, Upload
│   ├── prisma/               ← Schema และ migrations
│   └── nginx/                ← คอนฟิก Nginx (สำหรับ build web)
└── Frontend/
    ├── User/                 ← หน้าเว็บผู้ใช้
    └── Supportadmin/         ← หน้าแอดมิน
```

**หมายเหตุ:** `Backend/env.sample` และ `.env.example` เป็นไฟล์ตัวอย่างเท่านั้น ไม่มี key หรือรหัสลับ — copy ไปเป็น `.env` / `.env.local` แล้วเติมค่าจริงในไฟล์นั้น (และอย่า commit ไฟล์ `.env`)

---

## แก้ปัญหาเบื้องต้น

| อาการ | แนวทางแก้ |
|--------|------------|
| **เชื่อมต่อ backend ไม่ได้ / อัปโหลดไม่ได้** | ตรวจว่า container **legacy** และ **web** รันอยู่: `docker compose ps` — ถ้า **web** ไม่ขึ้น มักเพราะพอร์ต 8083 ถูกใช้ → ใช้ `docker-compose.port8080.yml` รัน web ที่ 8082 แล้วเปิด http://localhost:8082 |
| **แอดมินเข้าไม่ได้ / ล็อกอิน admin ไม่ได้** | ยังไม่มี user ใน DB → รัน seed: `docker compose exec legacy node server/scripts/seed-admins.js` (จากโฟลเดอร์ bb) แล้วล็อกอินด้วย `admin@admin.com` / `admin1234` |
| **เปิดจาก IP อื่นใน LAN แล้วเชื่อมต่อ backend ไม่ได้** | เปิด Windows Firewall อนุญาต Inbound พอร์ต **8083** (และ 3014 ถ้าเข้า Supportadmin) |
| **พอร์ตถูกใช้อยู่** (5052, 8083, 3014) | ปิด process ที่ใช้พอร์ตนั้น หรือเปลี่ยนพอร์ตใน Docker-compose / .env |
| **Login แล้วขึ้น Network error** | ตรวจว่า Backend รันที่ 5052 และ Frontend ชี้ `REACT_APP_API_BASE_URL` ไปที่ถูก |
| **อัปโหลดเอกสารแล้วไม่ประมวลผล** | ตรวจว่าใน Docker ใช้ `UPLOAD_QUEUE_MODE=redis` และ Redis รันอยู่; ถ้ารัน Local ใช้ `memory` ได้ |
| **Embedding / แชท error เรื่อง API key** | ตรวจ `OPENAI_API_KEY`, `EMBEDDING_API_KEY` หรือ `GEMINI_API_KEY` ใน `Backend/.env` |

**สคริปต์ช่วยตรวจ:** จากโฟลเดอร์ bb รัน `.\check-worker.ps1` (หรือ `.\check-worker.bat`) เพื่อดูว่า Docker รันอยู่หรือไม่ และมีไฟล์ `.env` หรือไม่

---

## ลิงก์เพิ่มเติม

- **Backend:** [Backend/README.md](Backend/README.md) (ถ้ามี)
- **Frontend User / Supportadmin:** ดู README ในโฟลเดอร์ `Frontend/User` และ `Frontend/Supportadmin` (ถ้ามี)
