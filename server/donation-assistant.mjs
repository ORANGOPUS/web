/*
  Donation support assistant: the server half of the chat widget (src/components/DonationAssistant.vue).

  Visitors' questions go to Claude from here, never from the browser, so the API key stays secret.
  Hosting adapters: api/assistant.mjs (Vercel), netlify/functions/assistant.mjs (Netlify),
  scripts/assistant-dev-server.mjs (local `npm run dev`).

  Environment (server-side only, never prefix these with VUE_APP_):
    ANTHROPIC_API_KEY   required. Without it the widget says the assistant is offline.
    ASSISTANT_MODEL     optional, defaults to claude-opus-5.
  It also reads the public VUE_APP_STRIPE_* / VUE_APP_DONATION_CURRENCY values so it only
  recommends donation options that are switched on.
*/

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ASSISTANT_MODEL || "claude-opus-5";
const MAX_TURNS = 24;
const MAX_MESSAGE_CHARS = 1200;
const MAX_TOOL_ROUNDS = 4;
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 30 };

const TIERS = [
  { amount: "5", name: "Low Earth Orbit", once: "helps keep Orangopus free and open for every creator who joins.", monthly: "helps cover the infrastructure our community projects run on." },
  { amount: "25", name: "Lunar", once: "helps fund tools and resources for creators starting their first project.", monthly: "gives our projects steady support they can plan around." },
  { amount: "100", name: "Deep Space", once: "helps us back new community projects and get them off the ground.", monthly: "helps sustain our mission of making creation accessible to everyone." }
];

const SYSTEM_PROMPT = `You are the donation helper on the Orangopus website. You answer visitors' questions about Orangopus and about donating, and help each person pick the donation option that suits them.

About Orangopus:
- Orangopus is a grassroots nonprofit open collective supporting creators of all backgrounds. No gatekeepers, no agendas.
- It is for creators, developers, dreamers and anyone interested in collaborative, open-source projects. People get involved by exploring the projects, joining the Discord community, or contributing to an open-source initiative.
- Ways to support it: contributing code, sharing ideas, spreading the word, or donating.
- Where the money goes: as a nonprofit, every donation goes into supporting its projects, maintaining its infrastructure and making creation accessible to everyone.

How donating works:
- Donations are one-off or monthly. The preset amounts are ${"{currency}"}5 (Low Earth Orbit), ${"{currency}"}25 (Lunar) and ${"{currency}"}100 (Deep Space). One-off gifts can also be any amount the donor chooses. Monthly gifts are preset amounts only.
- What each amount does:
${TIERS.map(t => `  - ${"{currency}"}${t.amount} one-off ${t.once} ${"{currency}"}${t.amount} a month ${t.monthly}`).join("\n")}
- Payment happens on Stripe's secure checkout, which takes cards, Apple Pay and Google Pay. Orangopus never sees card details.
- A monthly gift lets Orangopus plan ahead. Stripe emails the donor a link to change or cancel it at any time.
- After paying, donors land on a thank-you page.
- The full donate page is at /donate.

How to help:
- Keep replies short and warm: two to four sentences, plain text, no markdown, headings or bullet symbols.
- When someone wants to give, or asks which option to choose, ask at most one short question if you need it (one-off or monthly, and a rough amount), then call show_donation_button with the best match. The button appears under your reply, so say one sentence about it rather than pasting links.
- Call get_donation_options before recommending, so you only suggest options that are switched on. If none are, say online donations are being set up and point them to /donate or the Discord community.
- Never pressure anyone. Every contribution matters, including non-financial ones.
- Never ask for, or accept, card numbers, bank details or passwords in the chat. If someone shares them, tell them not to and that payment only happens on Stripe's checkout.
- You don't have information about tax relief, Gift Aid, receipts for past donations, refunds, legal registration or finances beyond what is written here. Don't guess: say you don't know and suggest they ask the team through the Contact link in the site footer or the Discord community.
- Stay on topic. For anything unrelated to Orangopus, its community or donating, briefly say you can only help with those.`;

const TOOLS = [
  {
    name: "get_donation_options",
    description: "Lists the donation options that are currently switched on, with the currency. Call before recommending an option.",
    input_schema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "show_donation_button",
    description: "Shows the visitor a button that takes them to Stripe checkout for one donation option. Use once you know the frequency and amount that suit them.",
    input_schema: {
      type: "object",
      properties: {
        frequency: { type: "string", enum: ["once", "monthly"], description: "one-off or monthly" },
        amount: { type: "string", enum: ["5", "25", "100", "custom"], description: "Preset amount, or custom (one-off only) to let the donor choose on Stripe" }
      },
      required: ["frequency", "amount"],
      additionalProperties: false
    },
    strict: true
  }
];

let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

function currency() {
  return process.env.VUE_APP_DONATION_CURRENCY || "£";
}

function isStripeLink(url) {
  return typeof url === "string" && /^https:\/\/(buy|donate)\.stripe\.com\//.test(url);
}

export function donationOptions() {
  const options = [];
  for (const frequency of ["once", "monthly"]) {
    for (const amount of ["5", "25", "100", "custom"]) {
      if (frequency === "monthly" && amount === "custom") continue;
      if (isStripeLink(process.env[`VUE_APP_STRIPE_${frequency.toUpperCase()}_${amount.toUpperCase()}`])) {
        options.push({ frequency, amount });
      }
    }
  }
  return options;
}

function runTool(name, input, actions) {
  if (name === "get_donation_options") {
    const options = donationOptions();
    return JSON.stringify({ currency: currency(), options, note: options.length ? undefined : "No online donation options are switched on yet." });
  }
  if (name === "show_donation_button") {
    const { frequency, amount } = input || {};
    if (!["once", "monthly"].includes(frequency) || !["5", "25", "100", "custom"].includes(amount)) {
      return { error: "Unknown option. Use frequency once|monthly and amount 5|25|100|custom." };
    }
    if (frequency === "monthly" && amount === "custom") {
      return { error: "Monthly gifts are preset amounts only. Offer 5, 25 or 100 a month, or a one-off custom amount." };
    }
    const live = donationOptions().some(o => o.frequency === frequency && o.amount === amount);
    actions.push({ type: "donate", frequency, amount });
    return live
      ? "The button is now showing under your reply."
      : "The button is showing, but this option isn't switched on yet, so it opens the donate page instead of Stripe. Mention that gently.";
  }
  return { error: `Unknown tool ${name}` };
}

/** Validates and normalises the browser-supplied transcript. Returns null when it's unusable. */
function cleanTranscript(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TURNS) return null;
  const messages = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    const content = m.content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;
    const last = messages[messages.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + content;
    else messages.push({ role: m.role, content });
  }
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return null;
  return messages;
}

const hits = new Map();
function rateLimited(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT.max;
}

const OFFLINE_REPLY = "Sorry, I can't answer right now. You can still give on the donate page, or ask the team on Discord.";

/**
 * Handles one chat request. `body` is the parsed JSON body ({ messages: [{role, content}] }).
 * Returns { status, body } for the hosting adapter to send as JSON.
 */
export async function handleAssistantRequest(body, { clientKey = "anon" } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: 503, body: { error: "not_configured", reply: "The donation helper isn't switched on yet. You can still give on the donate page." } };
  }
  if (rateLimited(clientKey)) {
    return { status: 429, body: { error: "rate_limited", reply: "You've sent a lot of messages in a short time. Please wait a few minutes and try again." } };
  }
  const messages = cleanTranscript(body?.messages);
  if (!messages) {
    return { status: 400, body: { error: "bad_request", reply: "Sorry, I couldn't read that message. Please try again." } };
  }

  const system = SYSTEM_PROMPT.replaceAll("{currency}", currency());
  const actions = [];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await getClient().beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        tools: TOOLS,
        messages
      });

      if (response.stop_reason === "refusal") {
        return { status: 200, body: { reply: "Sorry, I can't help with that one. I'm happy to answer questions about Orangopus or donating.", actions } };
      }

      const toolUses = response.content.filter(b => b.type === "tool_use");
      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        const reply = response.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
        return { status: 200, body: { reply: reply || "Is there anything else I can help with?", actions } };
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: toolUses.map(t => {
          const result = runTool(t.name, t.input, actions);
          return typeof result === "string"
            ? { type: "tool_result", tool_use_id: t.id, content: result }
            : { type: "tool_result", tool_use_id: t.id, content: result.error, is_error: true };
        })
      });
    }
    return { status: 200, body: { reply: "Here's what I'd suggest. You can also see every option on the donate page.", actions } };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      console.error("[assistant] Claude API rate limited", err.requestID);
      return { status: 503, body: { error: "busy", reply: "I'm getting a lot of questions right now. Please try again in a minute." } };
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[assistant] Claude API error", err.status, err.requestID, err.message);
    } else {
      console.error("[assistant] unexpected error", err);
    }
    return { status: 502, body: { error: "upstream", reply: OFFLINE_REPLY } };
  }
}
