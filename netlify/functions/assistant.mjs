// Netlify function: POST /api/assistant (routed in netlify.toml). The logic lives in server/donation-assistant.mjs.
import { handleAssistantRequest } from "../../server/donation-assistant.mjs";

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { Allow: "POST" } });
  }
  const body = await req.json().catch(() => null);
  const { status, body: payload } = await handleAssistantRequest(body, { clientKey: context.ip || "anon" });
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
};
