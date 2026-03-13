import express from "express";
import { prisma } from "../db.js";
import { qdrantUrl, redisUrl, vectorDb, pineconeApiKey, gatewayBaseUrl, openaiKey, openaiModel } from "../config.js";
import { isRedisReady } from "../redis.js";

export const healthRouter = express.Router();

const withTimeout = async (promise, ms) => {
  const timeoutMs = Number.isFinite(ms) ? ms : 0;
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Health check timed out")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const checkQdrant = async () => {
  if (!qdrantUrl) return { ok: false, error: "Missing QDRANT_URL" };
  try {
    const response = await withTimeout(fetch(`${qdrantUrl}/collections`), 1500);
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: text || `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

const checkPinecone = async () => {
  if (!pineconeApiKey) return { ok: false, error: "Missing PINECONE_API_KEY" };
  try {
    const { Pinecone } = await import("@pinecone-database/pinecone");
    const pc = new Pinecone({ apiKey: pineconeApiKey });
    await withTimeout(pc.listIndexes(), 3000);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

const AI_HEALTH_TIMEOUT_MS = 8000;

const checkAiService = async () => {
  if (!openaiKey || !gatewayBaseUrl) {
    return { ok: false, error: "Missing OPENAI_API_KEY or GATEWAY_BASE_URL", responseTimeMs: null, model: openaiModel || "—" };
  }
  const start = Date.now();
  try {
    const res = await withTimeout(
      fetch(`${gatewayBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel || "gpt-4.1",
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 1,
        }),
      }),
      AI_HEALTH_TIMEOUT_MS
    );
    const responseTimeMs = Date.now() - start;
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || `HTTP ${res.status}`, responseTimeMs, model: openaiModel || "—" };
    }
    return { ok: true, responseTimeMs, model: openaiModel || "—" };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      responseTimeMs,
      model: openaiModel || "—",
    };
  }
};

healthRouter.get("/", async (_req, res) => {
  const health = {
    ok: true,
    database: { ok: false },
    redis: { ok: false, enabled: Boolean(redisUrl) },
    qdrant: { ok: false },
    ai: { ok: false },
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database.ok = true;
  } catch (error) {
    console.error("Database connection failed", error);
    health.ok = false;
    const dbErrorMsg = error instanceof Error ? error.message : String(error);
    health.database = { ok: false, error: dbErrorMsg };
  }

  if (redisUrl) {
    health.redis.ok = isRedisReady();
  } else {
    health.redis.ok = true;
  }

  const vectorCheck = vectorDb === "pinecone" ? await checkPinecone() : await checkQdrant();
  health.qdrant = vectorCheck;

  const aiCheck = await checkAiService();
  health.ai = aiCheck;
  if (!aiCheck.ok) {
    health.ok = false;
  }

  if (!health.redis.ok || !health.database.ok || !health.qdrant.ok) {
    health.ok = false;
  }

  res.status(health.ok ? 200 : 503).json(health);
});
