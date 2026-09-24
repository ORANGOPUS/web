// Local stand-in for the hosted /api/* functions. `npm run dev` proxies /api to it.
// Reads ANTHROPIC_API_KEY, GITHUB_TOKEN, Supabase and Stripe values from your shell or .env.local.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { handleAssistantRequest } from "../server/donation-assistant.mjs";
import { handleGitHubRequest } from "../server/github.mjs";
import { handleProjectWriterRequest } from "../server/project-writer.mjs";

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const port = Number(process.env.ASSISTANT_PORT || 3001);

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const path = (req.url || "").split("?")[0];
  let result;
  if (path === "/api/assistant" && req.method === "POST") {
    result = await handleAssistantRequest(await readJson(req), { clientKey: req.socket.remoteAddress });
  } else if (path === "/api/github" && req.method === "GET") {
    result = await handleGitHubRequest();
  } else if (path === "/api/project-writer" && req.method === "POST") {
    result = await handleProjectWriterRequest(await readJson(req), { clientKey: req.socket.remoteAddress, authorization: req.headers.authorization });
  } else {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(result.status, { "Content-Type": "application/json" }).end(JSON.stringify(result.body));
}).listen(port, () => console.log(`Orangopus API on http://localhost:${port}/api/{assistant,github,project-writer}`));
