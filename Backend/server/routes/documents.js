import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { prisma } from "../db.js";
import { authenticate } from "../lib/auth.js";
import { invalidateUserCaches } from "../lib/cache.js";
import { allowedUploadExtensions, allowedUploadMimeTypes, qdrantCollectionName, storeRawFiles } from "../config.js";
import { deleteDocumentVectors, indexDocumentChunks } from "../services/vectorDb.js";
import { ensureSourceFileBlocks } from "../services/text.js";
import { runOcrExtract, previewPdfStructure } from "../services/uploadQueue.js";

export const documentsRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

const allowedShareRoles = new Set(["viewer", "editor"]);
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 32;

const stripSourceFiles = (sourceFiles) => {
  if (!Array.isArray(sourceFiles)) return sourceFiles;
  return sourceFiles.map((file) => {
    if (!file || typeof file !== "object") return file;
    const { text, blocks, ...rest } = file;
    return rest;
  });
};

const normalizeExtension = (name = "") => path.extname(String(name)).toLowerCase();
const isAllowedSourceFile = (file) => {
  if (!file || typeof file !== "object") return true;
  const name = file.name || "";
  const type = file.type || "";
  const ext = normalizeExtension(name);
  const hasAllowedExt = ext ? allowedUploadExtensions.includes(ext) : false;
  const hasAllowedType = type ? allowedUploadMimeTypes.includes(String(type)) : false;
  return !(type || ext) || hasAllowedExt || hasAllowedType;
};

const normalizeTags = (tags = []) => {
  const normalized = tags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, MAX_TAG_LENGTH));
  const seen = new Set();
  const deduped = [];
  for (const tag of normalized) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(tag);
    if (deduped.length >= MAX_TAGS) break;
  }
  return deduped;
};

const parseTags = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  return normalizeTags(value);
};

const localFilesRoot = path.join(process.cwd(), ".files");
const isPathInsideRoot = (root, candidate) => {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(rootWithSep);
};

const HELP_DOC_DISPLAY_NAME = "คู่มือการใช้งาน";

documentsRouter.get("/", authenticate, async (req, res) => {
  const summary = ["1", "true", "yes"].includes(String(req.query.summary || "").toLowerCase());
  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { ownerId: req.user.id },
        { shares: { some: { userId: req.user.id } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    ...(summary
      ? {
          select: {
            id: true,
            displayName: true,
            ragStoreName: true,
            sourceFiles: true,
            createdAt: true,
            ownerId: true,
            tags: true,
            link: true,
            shares: {
              select: {
                id: true,
                role: true,
                user: { select: { id: true, email: true, name: true } },
              },
            },
          },
        }
      : {
          include: {
            shares: {
              select: {
                id: true,
                role: true,
                user: { select: { id: true, email: true, name: true } },
              },
            },
          },
        }),
  });
  // ไม่โชว์คู่มือการใช้งานในหน้ารายการ Knowledge (ใช้เบื้องหลังสำหรับ 3 ปุ่มบอทช่วยสอน)
  const filtered = documents.filter((d) => d.displayName !== HELP_DOC_DISPLAY_NAME);
  if (summary) {
    res.json(
      filtered.map((doc) => ({
        ...doc,
        sourceFiles: stripSourceFiles(doc.sourceFiles),
      })),
    );
    return;
  }
  res.json(filtered);
});

documentsRouter.post("/", authenticate, async (req, res) => {
  const { displayName, sourceFiles, tags, link } = req.body ?? {};

  if (!displayName || !sourceFiles) {
    res.status(400).json({ error: "displayName and sourceFiles are required" });
    return;
  }

  if (!Array.isArray(sourceFiles) || sourceFiles.some((file) => !isAllowedSourceFile(file))) {
    res.status(400).json({ error: "Unsupported file type" });
    return;
  }
  const normalizedTags = parseTags(tags);
  if (normalizedTags === null) {
    res.status(400).json({ error: "tags must be an array" });
    return;
  }
  const normalizedLink = typeof link === "string" ? link.trim().slice(0, 2048) : null;
  const preparedFiles = ensureSourceFileBlocks(sourceFiles);
  const document = await prisma.document.create({
    data: {
      displayName,
      ragStoreName: qdrantCollectionName,
      sourceFiles: preparedFiles,
      ownerId: req.user.id,
      tags: normalizedTags ?? [],
      link: normalizedLink || null,
    },
  });

  try {
    await indexDocumentChunks({
      documentId: document.id,
      userId: req.user.id,
      sourceFiles: preparedFiles,
    });
    res.status(201).json(document);
  } catch (error) {
    await prisma.document.delete({ where: { id: document.id } }).catch(() => null);
    res.status(500).json({ error: "Failed to index document" });
    return;
  }

  await invalidateUserCaches(req.user.id);
});

documentsRouter.delete("/:id", authenticate, async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, ownerId: req.user.id },
  });

  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  if (document.displayName === HELP_DOC_DISPLAY_NAME) {
    res.status(403).json({ error: "ไม่สามารถลบคู่มือการใช้งานได้" });
    return;
  }

  // Best-effort cleanup: remove stored original files for this document (if any)
  const localDocDir = path.join(localFilesRoot, req.user.id, document.id);
  fsPromises.rm(localDocDir, { recursive: true, force: true }).catch(() => null);

  await prisma.document.delete({ where: { id: document.id } });
  res.json({ ok: true });
  deleteDocumentVectors(document.id).catch(() => null);
  await invalidateUserCaches(req.user.id);
});

documentsRouter.patch("/:id", authenticate, async (req, res) => {
  const { displayName, sourceFiles, tags, link } = req.body ?? {};

  if (!displayName && !sourceFiles && tags === undefined && link === undefined) {
    res.status(400).json({ error: "displayName, sourceFiles, tags, or link is required" });
    return;
  }

  const document = await prisma.document.findFirst({
    where: {
      id: req.params.id,
      OR: [
        { ownerId: req.user.id },
        { shares: { some: { userId: req.user.id, role: "editor" } } },
      ],
    },
  });

  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  if (document.displayName === HELP_DOC_DISPLAY_NAME) {
    res.status(403).json({ error: "ไม่สามารถแก้ไขคู่มือการใช้งานได้" });
    return;
  }

  if (sourceFiles && (!Array.isArray(sourceFiles) || sourceFiles.some((file) => !isAllowedSourceFile(file)))) {
    res.status(400).json({ error: "Unsupported file type" });
    return;
  }
  const normalizedTags = parseTags(tags);
  if (normalizedTags === null) {
    res.status(400).json({ error: "tags must be an array" });
    return;
  }
  const normalizedLink = link === undefined
    ? undefined
    : typeof link === "string"
      ? link.trim().slice(0, 2048) || null
      : null;
  const preparedFiles = sourceFiles ? ensureSourceFileBlocks(sourceFiles) : undefined;
  const updated = await prisma.document.update({
    where: { id: document.id },
    data: {
      displayName: displayName ?? undefined,
      sourceFiles: preparedFiles ?? undefined,
      tags: normalizedTags ?? undefined,
      link: normalizedLink,
    },
    include: {
      shares: {
        select: {
          id: true,
          role: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (preparedFiles) {
    await deleteDocumentVectors(updated.id).catch(() => null);
    try {
      await indexDocumentChunks({
        documentId: updated.id,
        userId: req.user.id,
        sourceFiles: preparedFiles,
      });
    } catch (embedErr) {
      const msg = embedErr?.message || String(embedErr);
      // คีย์ใช้ได้แค่บางโมเดล — แนะนำให้ตั้ง EMBEDDING_MODEL ใน .env
      const hint = /key not allowed to access model|only access models=\[.+\]/.test(msg)
        ? " แก้ใน Backend/.env: ตั้ง EMBEDDING_MODEL ให้ตรงกับโมเดลที่คีย์รองรับ (เช่น Qwen3-Embedding-4B)"
        : "";
      res.status(500).json({
        error: `การแปลงเป็น Vector ล้มเหลว: ${msg}${hint}`,
      });
      return;
    }
  }

  res.json(updated);
  await invalidateUserCaches(req.user.id);
});

documentsRouter.get("/:id/shares", authenticate, async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, ownerId: req.user.id },
    include: {
      shares: {
        select: {
          id: true,
          role: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(document.shares);
});

documentsRouter.post("/:id/shares", authenticate, async (req, res) => {
  const { email, role } = req.body ?? {};
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  const desiredRole = role || "viewer";
  if (!allowedShareRoles.has(desiredRole)) {
    res.status(400).json({ error: "role must be viewer or editor" });
    return;
  }

  const document = await prisma.document.findFirst({
    where: { id: req.params.id, ownerId: req.user.id },
  });

  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.id === req.user.id) {
    res.status(400).json({ error: "Owner already has access" });
    return;
  }

  await prisma.documentShare.upsert({
    where: {
      documentId_userId: { documentId: document.id, userId: user.id },
    },
    update: { role: desiredRole },
    create: { documentId: document.id, userId: user.id, role: desiredRole },
  });

  const shares = await prisma.documentShare.findMany({
    where: { documentId: document.id },
    select: {
      id: true,
      role: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  res.json(shares);
  await invalidateUserCaches(req.user.id);
});

documentsRouter.delete("/:id/shares", authenticate, async (req, res) => {
  const { email } = req.body ?? {};
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const document = await prisma.document.findFirst({
    where: { id: req.params.id, ownerId: req.user.id },
  });

  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.documentShare.deleteMany({
    where: { documentId: document.id, userId: user.id },
  });

  const shares = await prisma.documentShare.findMany({
    where: { documentId: document.id },
    select: {
      id: true,
      role: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  res.json(shares);
  await invalidateUserCaches(req.user.id);
});

const OCR_MIN_TEXT_CHARS = Number(process.env.OCR_MIN_TEXT_CHARS || 200);

/** POST /api/documents/:id/files/ocr — อัปโหลดไฟล์แล้วทำ OCR (ให้ frontend Add Data เรียกได้) */
documentsRouter.post("/:id/files/ocr", authenticate, upload.single("file"), async (req, res) => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { ownerId: req.user.id },
          { shares: { some: { userId: req.user.id } } },
        ],
      },
    });
    if (!document) {
      res.status(404).json({ ok: false, error: "Document not found" });
      return;
    }
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ ok: false, error: "ไม่มีไฟล์" });
      return;
    }
    const fileName = req.file.originalname || req.file.fieldname || "file";
    const contentType = req.file.mimetype || "application/octet-stream";
    const isPdf = contentType.toLowerCase().includes("pdf") || /\.pdf$/i.test(fileName);

    let body;
    if (isPdf) {
      // PDF: ดึงข้อความก่อน (pdfjs/pdfplumber). ถ้าได้น้อย = สแกน → ใช้ Typhoon OCR
      const preview = await previewPdfStructure({
        buffer: req.file.buffer,
        fileName,
        contentType,
      });
      const previewText = (preview.blocks || [])
        .map((b) => (b && b.text ? b.text : ""))
        .join("\n\n")
        .replace(/\s+/g, " ")
        .trim();
      if (previewText.length < OCR_MIN_TEXT_CHARS) {
        body = await runOcrExtract({
          buffer: req.file.buffer,
          fileName,
          contentType,
          provider: "typhoon",
        });
      } else {
        body = {
          text: (preview.blocks || []).map((b) => b?.text || "").join("\n\n").trim(),
          blocks: preview.blocks || [],
          pages: [],
        };
      }
    } else {
      body = await runOcrExtract({
        buffer: req.file.buffer,
        fileName,
        contentType,
        provider: "paddle",
      });
    }

    let text = (body?.text || "").trim();
    let blocks = Array.isArray(body?.blocks) && body.blocks.length > 0
      ? body.blocks
      : null;
    if (!blocks && Array.isArray(body?.pages) && body.pages.length > 0) {
      blocks = body.pages
        .map((p) => ({ text: (p.text || "").trim(), label: `Page ${p.page || "?"}` }))
        .filter((b) => b.text.length > 0);
      if (!text && blocks.length > 0) {
        text = blocks.map((b) => b.text).join("\n\n");
      }
    }
    if (!blocks) {
      blocks = text ? [{ text, label: "Content" }] : [];
    }

    res.json({
      ok: true,
      filename: fileName,
      text,
      blocks,
      pages: body?.pages,
      metadata: body?.metadata || {},
    });
  } catch (e) {
    const msg = e?.message || String(e);
    console.error("[documents] OCR error:", msg);
    res.status(503).json({ ok: false, error: msg });
  }
});

documentsRouter.get("/:id", authenticate, async (req, res) => {
  const document = await prisma.document.findFirst({
    where: {
      id: req.params.id,
      OR: [
        { ownerId: req.user.id },
        { shares: { some: { userId: req.user.id } } },
      ],
    },
    include: {
      shares: {
        select: {
          id: true,
          role: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(document);
});

documentsRouter.get("/:id/files/:index/download", authenticate, async (req, res) => {
  if (!storeRawFiles) {
    // Privacy mode: we do not store original files.
    res.status(404).json({ error: "Original file storage is disabled" });
    return;
  }

  const index = Number(req.params.index);
  if (!Number.isFinite(index) || index < 0) {
    res.status(400).json({ error: "Invalid file index" });
    return;
  }

  const document = await prisma.document.findFirst({
    where: {
      id: req.params.id,
      OR: [
        { ownerId: req.user.id },
        { shares: { some: { userId: req.user.id } } },
      ],
    },
  });
  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const sourceFiles = Array.isArray(document.sourceFiles) ? document.sourceFiles : [];
  const file = sourceFiles[index];
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const storage = file?.storage || null;
  const fileName = file?.name || `file-${index + 1}`;

  if (storage?.provider === "s3") {
    if (storage.url) {
      res.redirect(String(storage.url));
      return;
    }
    res.status(400).json({ error: "File is not publicly accessible (missing storage.url)" });
    return;
  }

  const filePath = storage?.path;
  if (!filePath || typeof filePath !== "string") {
    res.status(404).json({ error: "Original file not available" });
    return;
  }

  if (!isPathInsideRoot(localFilesRoot, filePath)) {
    res.status(400).json({ error: "Invalid file path" });
    return;
  }
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File missing on disk" });
    return;
  }

  res.download(filePath, fileName);
});
