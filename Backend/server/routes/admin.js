import express from "express";
import { prisma } from "../db.js";
import { authenticate, requireAdmin, requireAdminMetrics, requireRole, sanitizeUser } from "../lib/auth.js";
import { getRequestContext } from "../lib/requestContext.js";
import { logEvent } from "../lib/logging.js";
import { deleteBotWithCleanup } from "../services/uploadQueue.js";
import { deleteDocumentVectors } from "../services/vectorDb.js";
import { invalidateUserCaches } from "../lib/cache.js";
import { ensureSourceFileBlocks } from "../services/text.js";
import { indexDocumentChunks } from "../services/vectorDb.js";

export const adminRouter = express.Router();

const HELP_DOC_DISPLAY_NAME = "คู่มือการใช้งาน";

adminRouter.get("/metrics", authenticate, requireAdminMetrics, async (_req, res) => {
  const [
    usersCount,
    documentsCount,
    conversationsCount,
    messagesCount,
    uploadBatchesCount,
    pendingUsersCount,
    botsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.document.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.uploadBatch.count(),
    prisma.user.count({ where: { approvalStatus: "pending", role: "user" } }),
    prisma.bot.count(),
  ]);

  res.json({
    usersCount,
    documentsCount,
    conversationsCount,
    messagesCount,
    uploadBatchesCount,
    pendingUsersCount,
    botsCount,
    timestamp: new Date().toISOString(),
  });
});

adminRouter.get("/activity", authenticate, requireAdminMetrics, async (req, res) => {
  const daysRaw = Number(req.query?.days);
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(90, Math.floor(daysRaw))) : 14;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const platformRows = await prisma.message.groupBy({
    by: ["platform"],
    where: { role: "user", createdAt: { gte: from, lte: to } },
    _count: { _all: true },
  });
  const platformCounts = {};
  platformRows.forEach((row) => {
    const key = String(row.platform || "website").toLowerCase();
    platformCounts[key] = (platformCounts[key] || 0) + row._count._all;
  });

  const seriesRows = await prisma.$queryRaw`
    SELECT
      date_trunc('day', "createdAt")::date AS "day",
      "role" AS "role",
      COUNT(*)::int AS "count"
    FROM "Message"
    WHERE
      "createdAt" >= ${from}
      AND "createdAt" <= ${to}
      AND "role" IN ('user', 'model')
    GROUP BY 1, 2
    ORDER BY 1 ASC;
  `;

  const series = (Array.isArray(seriesRows) ? seriesRows : []).map((row) => ({
    day: typeof row.day === "string" ? row.day : new Date(row.day).toISOString().slice(0, 10),
    role: String(row.role || "user"),
    count: Number(row.count || 0),
  }));

  res.json({
    range: { from: from.toISOString(), to: to.toISOString(), days },
    platformCounts,
    series,
  });
});

adminRouter.get("/users", authenticate, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          documents: true,
          conversations: true,
          messages: true,
          bots: true,
        },
      },
    },
  });
  res.json(
    users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      isActive: user.isActive,
      createdAt: user.createdAt,
      counts: user._count,
    })),
  );
});

const ALLOWED_ROLES = ["user", "support", "admin_metrics", "admin"];

adminRouter.patch("/users/:id", authenticate, requireRole("support", "admin"), async (req, res) => {
  const { role, isActive } = req.body ?? {};
  if (role === undefined && isActive === undefined) {
    res.status(400).json({ error: "role or isActive is required" });
    return;
  }
  if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
    res.status(400).json({ error: `role must be one of: ${ALLOWED_ROLES.join(", ")}` });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  // Support cannot set role to admin, and cannot edit admin users
  if (req.user.role === "support") {
    if (target.role === "admin") {
      res.status(403).json({ error: "Support cannot modify admin users" });
      return;
    }
    if (role === "admin") {
      res.status(403).json({ error: "Support cannot set role to admin" });
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      role: role ?? undefined,
      isActive: isActive ?? undefined,
      approvalStatus: role && role !== "user" ? "approved" : undefined,
    },
  });

  res.json(sanitizeUser(updated));
});

adminRouter.delete("/users/:id", authenticate, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  if (req.user?.id === userId) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await logEvent({
    event: "admin.user.deleted",
    actorId: req.user.id,
    targetType: "user",
    targetId: userId,
    meta: { email: user.email, name: user.name, ...getRequestContext(req) },
  });
  await prisma.user.delete({ where: { id: userId } });
  res.json({ ok: true });
});

adminRouter.get("/documents", authenticate, requireRole("support", "admin"), async (_req, res) => {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      displayName: true,
      createdAt: true,
      owner: { select: { id: true, name: true } },
    },
  });
  res.json(documents);
});

adminRouter.get("/documents/:id", authenticate, requireRole("support", "admin"), async (req, res) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(document);
});

adminRouter.get("/bots", authenticate, requireRole("support", "admin"), async (_req, res) => {
  const bots = await prisma.bot.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      documents: { include: { document: { select: { id: true, displayName: true } } } },
    },
  });
  res.json(
    bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      prompt: bot.prompt,
      description: bot.description,
      model: bot.model,
      avatarUrl: bot.avatarUrl,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt,
      owner: bot.owner,
      documents: bot.documents.map((link) => link.document),
    })),
  );
});

adminRouter.patch("/bots/:id", authenticate, requireAdmin, async (req, res) => {
  const { name, prompt, description, enabled, model, avatarUrl, documentIds } = req.body ?? {};
  if (
    name === undefined &&
    prompt === undefined &&
    description === undefined &&
    enabled === undefined &&
    model === undefined &&
    avatarUrl === undefined &&
    documentIds === undefined
  ) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const bot = await prisma.bot.findUnique({
    where: { id: req.params.id },
    include: { documents: true },
  });
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedBot = await tx.bot.update({
      where: { id: bot.id },
      data: {
        name: typeof name === "string" ? name.trim().slice(0, 120) : undefined,
        prompt: typeof prompt === "string" ? prompt : undefined,
        description: description === null ? null : typeof description === "string" ? description : undefined,
        enabled: typeof enabled === "boolean" ? enabled : undefined,
        model: model === null ? null : typeof model === "string" ? model : undefined,
        avatarUrl: avatarUrl === null ? null : typeof avatarUrl === "string" ? avatarUrl : undefined,
      },
    });

    if (Array.isArray(documentIds)) {
      const ids = Array.from(new Set(documentIds.filter((id) => typeof id === "string" && id.trim())));
      await tx.botDocument.deleteMany({ where: { botId: bot.id } });
      if (ids.length) {
        await tx.botDocument.createMany({
          data: ids.map((documentId) => ({ botId: bot.id, documentId })),
          skipDuplicates: true,
        });
      }
    }

    const full = await tx.bot.findUnique({
      where: { id: bot.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        documents: { include: { document: { select: { id: true, displayName: true } } } },
      },
    });
    return full;
  });

  await logEvent({
    event: "admin.bot.updated",
    actorId: req.user.id,
    targetType: "bot",
    targetId: bot.id,
    meta: { ...getRequestContext(req) },
  });

  res.json({
    id: updated.id,
    name: updated.name,
    prompt: updated.prompt,
    description: updated.description,
    model: updated.model,
    avatarUrl: updated.avatarUrl,
    enabled: updated.enabled,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    owner: updated.owner,
    documents: updated.documents.map((link) => link.document),
  });
});

adminRouter.get("/guide", authenticate, requireAdmin, async (_req, res) => {
  const doc = await prisma.document.findFirst({
    where: { displayName: HELP_DOC_DISPLAY_NAME },
    orderBy: { createdAt: "desc" },
  });
  if (!doc) {
    res.status(404).json({ error: "Guide document not found" });
    return;
  }
  const files = Array.isArray(doc.sourceFiles) ? doc.sourceFiles : [];
  const file = files[0] || {};
  const text =
    typeof file?.text === "string"
      ? file.text
      : Array.isArray(file?.blocks)
        ? file.blocks.map((b) => (b?.text ?? "").trim()).filter(Boolean).join("\n\n")
        : "";
  res.json({ id: doc.id, displayName: doc.displayName, fileName: file?.name || "คู่มือการใช้งาน.txt", text });
});

adminRouter.patch("/guide", authenticate, requireAdmin, async (req, res) => {
  const { text, mode } = req.body ?? {};
  if (typeof text !== "string") {
    res.status(400).json({ error: "text is required" });
    return;
  }
  const doc = await prisma.document.findFirst({
    where: { displayName: HELP_DOC_DISPLAY_NAME },
    orderBy: { createdAt: "desc" },
  });
  if (!doc) {
    res.status(404).json({ error: "Guide document not found" });
    return;
  }
  const existingFiles = Array.isArray(doc.sourceFiles) ? doc.sourceFiles : [];
  const existingText = typeof existingFiles?.[0]?.text === "string" ? existingFiles[0].text : "";
  const nextText = mode === "append" ? `${existingText}${existingText ? "\n\n" : ""}${text}` : text;
  const preparedFiles = ensureSourceFileBlocks([{ name: "คู่มือการใช้งาน.txt", type: "text/plain", text: nextText }]);

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: { sourceFiles: preparedFiles },
  });

  // Reindex so help bot answers reflect latest guide text
  await indexDocumentChunks({
    documentId: updated.id,
    userId: updated.ownerId,
    sourceFiles: preparedFiles,
  }).catch(() => null);
  await invalidateUserCaches(updated.ownerId);

  await logEvent({
    event: "admin.guide.updated",
    actorId: req.user.id,
    targetType: "document",
    targetId: updated.id,
    meta: { displayName: updated.displayName, ...getRequestContext(req) },
  });

  res.json({ ok: true, id: updated.id });
});

adminRouter.delete("/documents/:id", authenticate, requireAdmin, async (req, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  await logEvent({
    event: "document.deleted",
    actorId: req.user.id,
    targetType: "document",
    targetId: document.id,
    meta: { displayName: document.displayName, ownerId: document.ownerId, ...getRequestContext(req) },
  });
  await prisma.document.delete({ where: { id: document.id } });
  res.json({ ok: true });
  deleteDocumentVectors(document.id).catch(() => null);
});

adminRouter.delete("/bots/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const bot = await prisma.bot.findUnique({
      where: { id: req.params.id },
      include: { owner: { select: { id: true, email: true } } },
    });
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }
    await logEvent({
      event: "bot.deleted",
      actorId: req.user.id,
      targetType: "bot",
      targetId: bot.id,
      meta: { name: bot.name, ownerId: bot.ownerId, ...getRequestContext(req) },
    });
    await deleteBotWithCleanup(bot.id);
    res.json({ ok: true });
    await invalidateUserCaches(bot.ownerId);
  } catch (error) {
    console.error("Failed to delete bot (admin)", error);
    res.status(500).json({ error: "Failed to delete bot" });
  }
});

adminRouter.get("/upload-batches", authenticate, requireAdmin, async (_req, res) => {
  const batches = await prisma.uploadBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
    take: 100,
  });
  res.json(batches);
});

adminRouter.get("/backup", authenticate, requireAdmin, async (_req, res) => {
  const [
    users,
    documents,
    shares,
    bots,
    botDocuments,
    conversations,
    messages,
    uploadBatches,
    uploadFiles,
    usageDaily,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.document.findMany(),
    prisma.documentShare.findMany(),
    prisma.bot.findMany(),
    prisma.botDocument.findMany(),
    prisma.conversation.findMany(),
    prisma.message.findMany(),
    prisma.uploadBatch.findMany(),
    prisma.uploadFile.findMany(),
    prisma.usageDaily.findMany(),
  ]);

  res.json({
    users,
    documents,
    shares,
    bots,
    botDocuments,
    conversations,
    messages,
    uploadBatches,
    uploadFiles,
    usageDaily,
  });
});

adminRouter.post("/restore", authenticate, requireAdmin, async (req, res) => {
  const payload = req.body ?? {};
  try {
    await prisma.$transaction(async (tx) => {
      if (Array.isArray(payload.users) && payload.users.length) {
        await tx.user.createMany({ data: payload.users, skipDuplicates: true });
      }
      if (Array.isArray(payload.documents) && payload.documents.length) {
        await tx.document.createMany({ data: payload.documents, skipDuplicates: true });
      }
      if (Array.isArray(payload.shares) && payload.shares.length) {
        await tx.documentShare.createMany({ data: payload.shares, skipDuplicates: true });
      }
      if (Array.isArray(payload.bots) && payload.bots.length) {
        await tx.bot.createMany({ data: payload.bots, skipDuplicates: true });
      }
      if (Array.isArray(payload.botDocuments) && payload.botDocuments.length) {
        await tx.botDocument.createMany({ data: payload.botDocuments, skipDuplicates: true });
      }
      if (Array.isArray(payload.conversations) && payload.conversations.length) {
        await tx.conversation.createMany({ data: payload.conversations, skipDuplicates: true });
      }
      if (Array.isArray(payload.messages) && payload.messages.length) {
        await tx.message.createMany({ data: payload.messages, skipDuplicates: true });
      }
      if (Array.isArray(payload.uploadBatches) && payload.uploadBatches.length) {
        await tx.uploadBatch.createMany({ data: payload.uploadBatches, skipDuplicates: true });
      }
      if (Array.isArray(payload.uploadFiles) && payload.uploadFiles.length) {
        await tx.uploadFile.createMany({ data: payload.uploadFiles, skipDuplicates: true });
      }
      if (Array.isArray(payload.usageDaily) && payload.usageDaily.length) {
        await tx.usageDaily.createMany({ data: payload.usageDaily, skipDuplicates: true });
      }
    });
    await logEvent({
      event: "admin.restore",
      actorId: req.user.id,
      targetType: "backup",
      targetId: null,
      meta: { ...getRequestContext(req) },
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("Restore failed", error);
    await logEvent({
      level: "error",
      event: "admin.restore.failed",
      actorId: req.user.id,
      targetType: "backup",
      targetId: null,
      outcome: "failed",
      meta: { error: error instanceof Error ? error.message : String(error), ...getRequestContext(req) },
    });
    res.status(500).json({ error: "Restore failed" });
  }
});
