// Vercel serverless function: POST /api/assistant. The logic lives in server/donation-assistant.mjs.
import { handleAssistantRequest } from "../server/donation-assistant.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  const clientKey = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  const { status, body: payload } = await handleAssistantRequest(body, { clientKey });
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(payload);
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
