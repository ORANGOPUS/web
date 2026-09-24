// Vercel serverless function: GET /api/github. The logic lives in server/github.mjs.
import { handleGitHubRequest } from "../server/github.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const { status, body } = await handleGitHubRequest();
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(status).json(body);
}
