import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CHAT_MAX_TOKENS,
  CHAT_TEMPERATURE,
  CHAT_TIMEOUT_MS,
  gatewayBaseUrl,
  openaiKey,
  openaiModel,
  ocrLlmApiKey,
  ocrLlmBaseUrl,
  ocrLlmModel,
  ocrLlmProvider,
  ollamaBaseUrl,
  ollamaOcrModel,
} from "../config.js";
import { Agent } from "undici";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** โหลดรายการคำผิด→คำถูกจาก server/ocr-word-fixes.json (ใส่เป็นข้อความ literal ไม่ต้องใช้ regex) แก้ไฟล์แล้ว request ถัดไปใช้รายการล่าสุด */
function loadOcrWordFixes() {
  const p = path.join(__dirname, "..", "ocr-word-fixes.json");
  try {
    if (fs.existsSync(p)) {
      const arr = JSON.parse(fs.readFileSync(p, "utf8"));
      return Array.isArray(arr) ? arr : [];
    }
  } catch {}
  return [];
}

const gatewayConnectTimeoutMs = Number(process.env.GATEWAY_CONNECT_TIMEOUT_MS || CHAT_TIMEOUT_MS || 30000);
const gatewayDispatcher = new Agent({
  connectTimeout: Number.isFinite(gatewayConnectTimeoutMs) ? gatewayConnectTimeoutMs : 30000,
});

export const callOpenAiGateway = async (messages, modelOverride) => {
  if (!openaiKey) {
    throw new Error("Configure OPENAI_API_KEY (or gateway key) in .env.local for chat.");
  }

  const modelToUse = modelOverride || openaiModel;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${gatewayBaseUrl}/chat/completions`, {
      method: "POST",
      dispatcher: gatewayDispatcher,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        temperature: CHAT_TEMPERATURE,
        max_tokens: CHAT_MAX_TOKENS,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Chat request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }

  return response.json();
};

/** เรียก gateway แบบ streaming — คืนค่า ReadableStream ของ response body (สำหรับ SSE) */
export const callOpenAiGatewayStream = async (messages, modelOverride) => {
  if (!openaiKey) {
    throw new Error("Configure OPENAI_API_KEY (or gateway key) in .env.local for chat.");
  }

  const modelToUse = modelOverride || openaiModel;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${gatewayBaseUrl}/chat/completions`, {
      method: "POST",
      dispatcher: gatewayDispatcher,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        temperature: CHAT_TEMPERATURE,
        max_tokens: CHAT_MAX_TOKENS,
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Chat request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }

  return response.body;
};

/** เรียก Ollama (localhost) สำหรับข้อความ OCR — ไม่ส่งข้อมูลออก เครื่อง รันในเครื่องเท่านั้น */
async function callOllamaChat(systemPrompt, userContent, signal) {
  const url = `${ollamaBaseUrl}/v1/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaOcrModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 16000,
    }),
    signal,
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

/**
 * แก้ข้อความจาก OCR ด้วยกฎ (รันทุกครั้ง ไม่ต้องพึ่ง LLM) — คำแบ่งผิด ช่องว่างเกิน ตัวเลขผสม
 */
export function postProcessOcrText(text) {
  if (!text || typeof text !== "string") return text;
  let s = text;
  // คำที่ OCR แบ่งผิด / สระ ำ อ่านผิดเป็น า — รวมกลับและแก้สระ
  const wordFixes = [
    [/บุ\s+ญ\b/g, "บุญ"],
    [/ส\s+ระบุรี/g, "สระบุรี"],
    [/องค์กา\s*ร\s+/g, "องค์การ "],
    [/องค\s*์?\s*การ/g, "องค์การ"],
    [/ประจ\s*ำ/g, "ประจำ"],
    [/สมัย\s+สามัญ/g, "สมัยสามัญ"],
    [/การ\s+งาน/g, "การงาน"],
    [/ข\s+้อ\s*มูล/g, "ข้อมูล"],
    [/ข้อ\s+ความ/g, "ข้อความ"],
    [/ระ\s+บบ/g, "ระบบ"],
    [/การ\s+ใช้/g, "การใช้"],
    [/ดัง\s+นี้/g, "ดังนี้"],
    [/ด้วย\s+กัน/g, "ด้วยกัน"],
    [/ที่\s+อยู่/g, "ที่อยู่"],
    [/ผู้\s+ใช้/g, "ผู้ใช้"],
    [/สิ่ง\s+ที่/g, "สิ่งที่"],
    [/เท\s+่านั้น/g, "เท่านั้น"],
    [/อาจ\s+จะ/g, "อาจจะ"],
    [/อยู่\s+ที่/g, "อยู่ที่"],
    [/และ\s+ยัง/g, "และยัง"],
    // สำนัก / ความสำคัญ / ปัญหา — ช่องว่างกลางคำ + OCR ใส่ ำ ผิดเป็น า
    [/ส\s*านัก/g, "สำนัก"],
    [/ส\s*ำนัก/g, "สำนัก"],
    [/ส\s*ำคัญ/g, "สำคัญ"],
    [/ท\s*วาม/g, "ความ"],
    [/ควำม/g, "ความ"],
    [/เป็นมำ\b/g, "เป็นมา"],
    [/ปัญหำ\b/g, "ปัญหา"],
    [/ควำมส\s*ำคัญ/g, "ความสำคัญ"],
    [/ความเป็นมำ/g, "ความเป็นมา"],
    // มหาวิทยาลัย / โดย / ดำเนินงาน — ช่องว่างกลางคำ
    [/มหาวิท\s*ยาลัย/g, "มหาวิทยาลัย"],
    [/โ\s*ดย\b/g, "โดย"],
    [/ด\s*าเนินงาน/g, "ดำเนินงาน"],
    [/ด\s*ำเนินงาน/g, "ดำเนินงาน"],
    // บริการ / สารสนเทศ / บรรณานุกรม — ำ ผิดเป็น า ในคำเหล่านี้
    [/บริกำร/g, "บริการ"],
    [/วิทยบริกำร/g, "วิทยบริการ"],
    [/สำรสนเทศ/g, "สารสนเทศ"],
    [/บรรณำนุกรม/g, "บรรณานุกรม"],
  ];
  for (const [re, replacement] of wordFixes) s = s.replace(re, replacement);
  // รายการเพิ่มจากไฟล์ server/ocr-word-fixes.json (คำผิด → คำถูก แบบ literal)
  for (const pair of loadOcrWordFixes()) {
    if (Array.isArray(pair) && pair.length >= 2 && typeof pair[0] === "string" && typeof pair[1] === "string") {
      s = s.split(pair[0]).join(pair[1]);
    }
  }
  // ตัวเลขที่มีช่องว่างคั่น เช่น 25 61 → 2561 (ปี พ.ศ.)
  s = s.replace(/\b(\d{2})\s+(\d{2})\b/g, "$1$2");
  // ช่องว่างเกิน (space, tab, non-breaking space ฯลฯ) → 1 ตัว
  s = s.replace(/[ \t\u00A0]{2,}/g, " ");
  // ตัวเลขผสม ไทย+อารบิก → อารบิก (ใช้ Unicode escape เพื่อไม่ให้ Node ผิดพลาด)
  const thaiToArab = { "\u0E50": "0", "\u0E51": "1", "\u0E52": "2", "\u0E53": "3", "\u0E54": "4", "\u0E55": "5", "\u0E56": "6", "\u0E57": "7", "\u0E58": "8", "\u0E59": "9" };
  s = s.replace(/([\u0E50-\u0E59])(\d{2,})/g, (_, thai, rest) => (thaiToArab[thai] || thai) + rest);
  s = s.replace(/(\d)([\u0E50-\u0E59]+)/g, (_, arab, thaiRest) => arab + [...thaiRest].map((c) => thaiToArab[c] || c).join(""));
  // ตัดสัญลักษณ์ตัดข้อความแบบ *****
  s = s.replace(/\s*\*{3,}\s*/g, " ");
  return s.trim();
}

/**
 * ส่งข้อความจาก OCR ไปให้ LLM จัดรูปแบบและแก้คำผิด (ใช้กับ PaddleOCR ก่อน embed).
 * มี post-process ด้วยกฎรันก่อนเสมอ จึงได้อย่างน้อยคำที่แบ่งผิด/ช่องว่าง/ตัวเลขแก้แล้วแม้ LLM ไม่รัน
 * คืนค่า { text, cleaned }: text = ข้อความที่ใช้ได้, cleaned = true เมื่อ LLM ประมวลผลสำเร็จจริง
 */
export const cleanOcrTextWithLlm = async (rawText) => {
  if (!rawText || String(rawText).trim().length === 0) return { text: rawText || "", cleaned: false };
  const afterRules = postProcessOcrText(String(rawText));
  const fallback = () => ({ text: afterRules, cleaned: false });
  const useOllama = ocrLlmProvider === "ollama";
  if (!useOllama && !ocrLlmApiKey) {
    console.warn("OCR LLM cleanup skipped: OCR_LLM_PROVIDER=openai but OCR_LLM_API_KEY/OPENAI_API_KEY is not set. Set key in .env or use OCR_LLM_PROVIDER=ollama with Ollama running.");
    return fallback();
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.OCR_LLM_CLEANUP_TIMEOUT_MS || 60000);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const systemPrompt =
    `You are a text cleaner. งานของคุณ: แก้แค่คำผิดและจัดย่อหน้า/ช่องว่างเท่านั้น

กฎสำคัญ (ต้องทำตาม):
- ห้ามสรุปเนื้อหา ห้ามย่อ ห้ามตัดส่วนใดออก ห้ามเปลี่ยนความหมาย
- ต้องส่งกลับข้อความความยาวเท่าเดิม (หรือยาวขึ้นแค่จากบรรทัดใหม่ที่จัดให้) ทุกประโยคทุกข้อความต้องอยู่ครบ
- คำที่ควรติดกัน ถ้ามีช่องว่างคั่นให้รวมเป็นคำเดียว เช่น "ส านัก" → "สำนัก", "ส ำคัญ" → "สำคัญ", "มหาวิท ยาลัย" → "มหาวิทยาลัย", "โ ดย" → "โดย", "ด าเนินงาน" → "ดำเนินงาน", "การ งาน" → "การงาน" — และคำอื่นที่ผิดแบบเดียวกัน (มีช่องว่างกลางคำ) ให้แก้ในลักษณะเดียวกัน
- แก้สระที่ OCR ผิด: "ควำม" → "ความ", "เป็นมำ" → "เป็นมา", "ปัญหำ" → "ปัญหา", "บริกำร" → "บริการ", "วิทยบริกำร" → "วิทยบริการ", "สำรสนเทศ" → "สารสนเทศ", "บรรณำนุกรม" → "บรรณานุกรม" — ถ้าเจอคำอื่นที่ใช้ ำ ผิดบริบท (ควรเป็น า) ให้แก้เหมือนกัน
- ตัวเลขที่มีช่องว่างคั่น เช่น "25 61" → "2561"
- แก้เฉพาะ: (1) คำที่แบ่งผิด/คำที่ควรติดกัน (2) ช่องว่างเกิน (3) ตัวเลขผสม/ตัวเลขมีวรรค (4) คำสะกดผิด/สระผิด (5) เครื่องหมายวรรคตอน (6) จัดบรรทัด/ย่อหน้าให้อ่านง่าย
- ส่งกลับเฉพาะข้อความที่แก้แล้ว ไม่มีคำอธิบาย ไม่มีหัวข้อเพิ่ม`;

  try {
    if (useOllama) {
      const content = await callOllamaChat(systemPrompt, afterRules, controller.signal);
      clearTimeout(timeoutId);
      if (content) return { text: postProcessOcrText(content), cleaned: true };
      console.warn("OCR LLM cleanup: Ollama returned empty. Check ollama serve and OLLAMA_OCR_MODEL. Using rule-cleaned text.");
      return fallback();
    }
    const response = await fetch(`${ocrLlmBaseUrl}/chat/completions`, {
      method: "POST",
      dispatcher: gatewayDispatcher,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ocrLlmApiKey}`,
      },
      body: JSON.stringify({
        model: ocrLlmModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: afterRules },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("OCR LLM cleanup failed:", response.status, await response.text());
      return fallback();
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (content && typeof content === "string" && content.trim()) {
      return { text: postProcessOcrText(content.trim()), cleaned: true };
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      console.warn("OCR LLM cleanup timed out, using rule-cleaned text");
    } else {
      console.warn("OCR LLM cleanup error, using rule-cleaned text", err?.message || err);
    }
    clearTimeout(timeoutId);
  }
  return fallback();
};

/** ส่งข้อความ (หลัง OCR/clean) ไปให้ LLM เรียบเรียงจัดโครงสร้าง: หัวข้อ ย่อหน้า รายการ (ใช้ก่อน embed) — รองรับ OpenAI หรือ Ollama */
export const structureOcrTextWithLlm = async (text) => {
  if (!text || String(text).trim().length === 0) return text;
  const useOllama = ocrLlmProvider === "ollama";
  if (!useOllama && !ocrLlmApiKey) return text;

  const controller = new AbortController();
  const timeoutMs = Number(process.env.OCR_LLM_STRUCTURE_TIMEOUT_MS || 60000);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const systemPrompt =
    `You are a document structure assistant. รับข้อความจาก OCR หรือเอกสาร (มักเป็นภาษาไทย) แล้วจัดเป็นโครงสร้างชัดเจน: หัวข้อ (headings), ย่อหน้า (paragraphs), รายการแบบ bullet หรือเลขลำดับ. รักษาเนื้อหาทุกอย่าง ไม่เพิ่มไม่ตัดความหมาย. ส่งกลับเฉพาะข้อความที่จัดโครงสร้างแล้ว ไม่มีคำอธิบาย.`;

  try {
    if (useOllama) {
      const content = await callOllamaChat(systemPrompt, text, controller.signal);
      clearTimeout(timeoutId);
      if (content) return content;
      return text;
    }
    const response = await fetch(`${ocrLlmBaseUrl}/chat/completions`, {
      method: "POST",
      dispatcher: gatewayDispatcher,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ocrLlmApiKey}`,
      },
      body: JSON.stringify({
        model: ocrLlmModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("OCR LLM structure failed:", response.status, await response.text());
      return text;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (content && typeof content === "string" && content.trim()) {
      return content.trim();
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      console.warn("OCR LLM structure timed out, using original text");
    } else {
      console.warn("OCR LLM structure error, using original text", err?.message || err);
    }
    clearTimeout(timeoutId);
  }
  return text;
};

/** ตรวจว่าข้อความมีคำทักทายอยู่ข้างใน (ไม่จำเป็นต้องเป็นแค่คำทักทายอย่างเดียว) */
export const isGreeting = (text = "") => {
  const normalized = text.toLowerCase();
  const greetingPatterns = [
    /(^|\s)(hi|hello|hey)\b/,
    /สวัสดี/,
    /หวัดดี/,
    /ดีครับ/,
    /ดีค่ะ/,
    /ขอบคุณ/,
    /thank you/,
    /thanks/,
  ];
  return greetingPatterns.some((pattern) => pattern.test(normalized));
};

export const isGreetingOnly = (text = "") => {
  const normalized = text.toLowerCase().trim();
  const patterns = [
    /^(hi|hello|hey)[!?.\s]*$/,
    /^สวัสดี(ครับ|ค่ะ|นะ)?[!?.\s]*$/,
    /^หวัดดี(ครับ|ค่ะ|นะ)?[!?.\s]*$/,
    /^ดีครับ[!?.\s]*$/,
    /^ดีค่ะ[!?.\s]*$/,
    /^ขอบคุณ(ครับ|ค่ะ|นะ)?[!?.\s]*$/,
    /^(thank you|thanks)[!?.\s]*$/,
  ];
  return patterns.some((pattern) => pattern.test(normalized));
};
