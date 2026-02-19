# แก้ไข Prisma Migration Issue

## ปัญหา
Prisma migrate dev บอกว่า "Already in sync" แต่ migration ใหม่ (Bot, Document) ยังไม่ได้ apply

## วิธีแก้ไข

### วิธีที่ 1: ใช้ prisma db push (แนะนำสำหรับ development)
```bash
cd Backend/Database/PostgreSQL
npx prisma db push
```

วิธีนี้จะ:
- สร้าง/อัปเดต tables ตาม schema.prisma โดยตรง
- ไม่ต้องจัดการ migration history
- เหมาะสำหรับ development

### วิธีที่ 2: Force apply migration
```bash
cd Backend/Database/PostgreSQL

# Mark migration เดิมว่า applied
npx prisma migrate resolve --applied 20260218070608_step_1

# Apply migration ใหม่
npx prisma migrate deploy
```

### วิธีที่ 3: ใช้ prisma migrate dev --create-only แล้ว apply เอง
```bash
cd Backend/Database/PostgreSQL

# ตรวจสอบ migration status
npx prisma migrate status

# ถ้ายังไม่ได้ apply ให้รัน
npx prisma migrate deploy
```

## ตรวจสอบว่า migration ถูก apply หรือยัง

```bash
# เช็ค migration status
npx prisma migrate status

# หรือเช็ค database โดยตรง
psql -h localhost -p 5433 -U bingsu_user -d bingsu_db -c "\dt"
```

## Migration ที่ควรมี
1. `20260218070608_step_1` - Initial (User, Chat, Credential)
2. `20260218145658_add_bots_and_documents` - Bot, Document, DocumentShare
