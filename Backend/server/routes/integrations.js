import express from "express";
import { prisma } from "../db.js";
import { authenticate } from "../lib/auth.js";
import { publicBaseUrl } from "../config.js";

export const integrationsRouter = express.Router();

const PROVIDERS = ["line", "messenger", "website", "api"];

const normalizeProvider = (value) => String(value || "").trim().toLowerCase();

/** สำหรับ LINE: ไม่ส่ง secret/token ออกไป แค่บอกว่ามีการตั้งค่าแล้ว + สร้าง webhook URL */
const maskLineConfig = (config) => {
  if (!config || typeof config !== "object") return null;
  return {
    botId: config.botId ?? null,
    hasChannelSecret: Boolean(config.channelSecret),
    hasChannelAccessToken: Boolean(config.channelAccessToken),
  };
};

integrationsRouter.get("/integrations", authenticate, async (req, res) => {
  const rows = await prisma.integrationSetting.findMany({
    where: { userId: req.user.id },
    orderBy: { provider: "asc" },
  });
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  res.json(
    PROVIDERS.map((provider) => {
      const row = byProvider.get(provider);
      const base = {
        provider,
        enabled: Boolean(row?.enabled),
        config: provider === "line" ? maskLineConfig(row?.config) : (row?.config ?? null),
        updatedAt: row?.updatedAt?.toISOString?.() ?? null,
      };
      if (provider === "line" && publicBaseUrl) {
        base.webhookUrl = `${publicBaseUrl}/api/webhooks/line`;
      }
      return base;
    }),
  );
});

integrationsRouter.patch("/integrations/:provider", authenticate, async (req, res) => {
  const provider = normalizeProvider(req.params.provider);
  if (!PROVIDERS.includes(provider)) {
    res.status(400).json({ error: "Unsupported provider" });
    return;
  }

  const { enabled, config } = req.body ?? {};
  if (enabled === undefined && config === undefined) {
    res.status(400).json({ error: "enabled or config is required" });
    return;
  }

  const safeEnabled = enabled === undefined ? undefined : Boolean(enabled);
  const safeConfig = config === undefined ? undefined : config;

  const updated = await prisma.integrationSetting.upsert({
    where: {
      userId_provider: {
        userId: req.user.id,
        // Prisma enum mapping: IntegrationProvider values are the same strings
        provider,
      },
    },
    update: {
      enabled: safeEnabled,
      config: safeConfig,
    },
    create: {
      userId: req.user.id,
      provider,
      enabled: safeEnabled ?? false,
      config: safeConfig ?? undefined,
    },
  });

  res.json({
    provider: updated.provider,
    enabled: updated.enabled,
    config: updated.config ?? null,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

