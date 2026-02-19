# Prisma Migration Baseline Guide

## ปัญหา
Database มี schema อยู่แล้ว แต่ Prisma migration history ไม่ตรงกัน

## วิธีแก้ไข

### วิธีที่ 1: Mark migration เดิมว่า applied (แนะนำ)
```bash
cd Backend/Database/PostgreSQL

# Mark migration เดิมว่า applied แล้ว
npx prisma migrate resolve --applied 20260218070608_step_1

# รัน migration ใหม่
npx prisma migrate deploy
```

### วิธีที่ 2: ใช้ prisma db push (สำหรับ development)
```bash
cd Backend/Database/PostgreSQL

# Push schema โดยตรง (ไม่ใช้ migration)
npx prisma db push
```

### วิธีที่ 3: Reset database (⚠️ จะลบข้อมูลทั้งหมด)
```bash
cd Backend/Database/PostgreSQL

# Reset และ apply migrations ทั้งหมด
npx prisma migrate reset
```

## Migration ที่มีอยู่
1. `20260218070608_step_1` - Initial migration (User, Chat, Credential)
2. `20260218145658_add_bots_and_documents` - Bot และ Document models
