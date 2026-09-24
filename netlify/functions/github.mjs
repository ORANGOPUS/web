// Netlify function: GET /api/github (routed in netlify.toml). The logic lives in server/github.mjs.
import { handleGitHubRequest } from "../../server/github.mjs";

export default async (req) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { Allow: "GET" } });
  }
  const { status, body } = await handleGitHubRequest();
  return Response.json(body, { status, headers: { "Cache-Control": "public, max-age=300" } });
};
