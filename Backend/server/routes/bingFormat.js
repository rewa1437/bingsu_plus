/**
 * Route แบบ Bing format — ให้ Bing frontend เรียกได้โดยไม่แก้ frontend
 * POST /documents/:id/files/ocr = อัปโหลดไฟล์แล้วทำ OCR ด้วย logic ของ askaa (runOcrExtract)
 */
import express from "express";
import multer from "multer";
import { authenticate } from "../lib/auth.js";
import { runOcrExtract } from "../services/uploadQueue.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

router.post("/:id/files/ocr", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ ok: false, error: "ไม่มีไฟล์" });
      return;
    }
    const fileName = req.file.originalname || req.file.fieldname || "file";
    const contentType = req.file.mimetype || "application/octet-stream";
    const isPdf = contentType.toLowerCase().includes("pdf") || /\.pdf$/i.test(fileName);
    const provider = isPdf ? "typhoon" : "paddle";

    const body = await runOcrExtract({
      buffer: req.file.buffer,
      fileName,
      contentType,
      provider,
    });

    const text = (body?.text || "").trim();
    const blocks = Array.isArray(body?.blocks) && body.blocks.length > 0
      ? body.blocks
      : (text ? [{ text, label: "Content" }] : []);

    res.json({
      ok: true,
      filename: fileName,
      text,
      blocks,
      metadata: body?.metadata || {},
    });
  } catch (e) {
    const msg = e?.message || String(e);
    console.error("[bingFormat] OCR error:", msg);
    res.status(503).json({ ok: false, error: msg });
  }
});

export const bingFormatRouter = router;
