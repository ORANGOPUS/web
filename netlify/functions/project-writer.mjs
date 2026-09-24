// Netlify function: POST /api/project-writer (routed in netlify.toml). The logic lives in server/project-writer.mjs.
import { handleProjectWriterRequest } from "../../server/project-writer.mjs";

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { Allow: "POST" } });
  }
  const body = await req.json().catch(() => null);
  const { status, body: payload } = await handleProjectWriterRequest(body, {
    clientKey: context.ip || "anon",
    authorization: req.headers.get("authorization")
  });
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
};
