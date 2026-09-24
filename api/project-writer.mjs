// Vercel serverless function: POST /api/project-writer. The logic lives in server/project-writer.mjs.
import { handleProjectWriterRequest } from "../server/project-writer.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const clientKey = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  const { status, body: payload } = await handleProjectWriterRequest(body, { clientKey, authorization: req.headers.authorization });
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(payload);
}
