// Local stand-in for the hosted /api/assistant function. `npm run dev` proxies /api to it.
// Reads ANTHROPIC_API_KEY (and optional VUE_APP_STRIPE_* links) from your shell or .env.local.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { handleAssistantRequest } from "../server/donation-assistant.mjs";

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const port = Number(process.env.ASSISTANT_PORT || 3001);

createServer(async (req, res) => {
  if (req.url !== "/api/assistant" || req.method !== "POST") {
    res.writeHead(404).end();
    return;
  }
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body = null;
  try {
    body = JSON.parse(raw);
  } catch {}
  const { status, body: payload } = await handleAssistantRequest(body, { clientKey: req.socket.remoteAddress });
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(payload));
}).listen(port, () => console.log(`Donation assistant API on http://localhost:${port}/api/assistant`));
