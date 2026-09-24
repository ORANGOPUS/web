<template>
  <div class="assistant" :class="{ open }">
    <section
      v-if="open"
      id="donation-assistant-panel"
      class="panel"
      role="dialog"
      aria-label="Donation helper"
    >
      <header class="panel-head">
        <img src="/orangopus-icon.svg" alt="" class="head-icon" />
        <div class="head-text">
          <h2>Ask Orangopus</h2>
          <p>Questions about us or donating</p>
        </div>
        <button type="button" class="icon-btn" aria-label="Start a new chat" title="New chat" @click="reset">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" /></svg>
        </button>
        <button type="button" class="icon-btn" aria-label="Close" @click="open = false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      <div ref="log" class="log" aria-live="polite">
        <div class="msg assistant-msg">
          <p>Hi! I can tell you about Orangopus, where donations go, and help you pick a way to give.</p>
        </div>

        <template v-for="(m, i) in messages" :key="i">
          <div class="msg" :class="m.role === 'user' ? 'user-msg' : 'assistant-msg'">
            <p>{{ m.content }}</p>
          </div>
          <a
            v-for="(a, j) in m.actions || []"
            :key="i + '-' + j"
            class="donate-card"
            :href="hrefFor(a)"
          >
            <span class="card-label">{{ labelFor(a) }}</span>
            <span class="card-sub">{{ subFor(a) }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="card-arrow"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
        </template>

        <div v-if="loading" class="msg assistant-msg typing" aria-label="Typing">
          <span></span><span></span><span></span>
        </div>

        <div v-if="!messages.length && !loading" class="starters">
          <button v-for="s in starters" :key="s" type="button" @click="send(s)">{{ s }}</button>
        </div>
      </div>

      <form class="composer" @submit.prevent="send()">
        <label for="assistant-input" class="sr-only">Your question</label>
        <textarea
          id="assistant-input"
          ref="input"
          v-model="draft"
          rows="1"
          maxlength="1000"
          placeholder="Ask a question…"
          :disabled="loading"
          @keydown.enter.exact.prevent="send()"
        ></textarea>
        <button type="submit" class="send" :disabled="loading || !draft.trim()" aria-label="Send">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
      <p class="fineprint">AI helper. Never share card details here; payment only happens on Stripe.</p>
    </section>

    <button
      type="button"
      class="launcher"
      :aria-expanded="open"
      aria-controls="donation-assistant-panel"
      @click="toggle"
    >
      <svg v-if="open" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      <template v-else>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>
        <span>Questions? Ask us</span>
      </template>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, nextTick } from "vue";
import { donationCurrency, stripeLinkFor, type DonationAmount, type DonationFrequency } from "@/config/donations";

interface DonateAction {
  type: "donate";
  frequency: DonationFrequency;
  amount: DonationAmount;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: DonateAction[];
}

const STORAGE_KEY = "orangopus-assistant";
const MAX_SENT_MESSAGES = 20;

export default defineComponent({
  name: "DonationAssistant",
  data() {
    return {
      open: false,
      draft: "",
      loading: false,
      messages: [] as ChatMessage[],
      starters: [
        "Where does my donation go?",
        "Should I give monthly or one-off?",
        "Help me choose an amount"
      ]
    };
  },
  created() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (saved && Array.isArray(saved.messages)) {
        this.messages = saved.messages;
        this.open = !!saved.open;
      }
    } catch {
      // Storage can be blocked (private mode); the chat still works without it.
    }
  },
  watch: {
    messages: { deep: true, handler() { this.persist(); } },
    open(value: boolean) {
      this.persist();
      if (value) this.focusAndScroll();
    }
  },
  methods: {
    toggle() {
      this.open = !this.open;
    },
    reset() {
      this.messages = [];
      this.draft = "";
      this.focusAndScroll();
    },
    persist() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ open: this.open, messages: this.messages }));
      } catch {
        // ignore
      }
    },
    async focusAndScroll() {
      await nextTick();
      const log = this.$refs.log as HTMLElement | undefined;
      if (log) log.scrollTop = log.scrollHeight;
      (this.$refs.input as HTMLTextAreaElement | undefined)?.focus();
    },
    async send(text?: string) {
      const content = (text ?? this.draft).trim();
      if (!content || this.loading) return;
      this.draft = "";
      this.messages.push({ role: "user", content });
      this.loading = true;
      this.focusAndScroll();

      const transcript = this.messages
        .slice(-MAX_SENT_MESSAGES)
        .map(m => ({ role: m.role, content: m.content }));

      let reply = "Sorry, I can't answer right now. You can still give on the donate page.";
      let actions: DonateAction[] = [];
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: transcript })
        });
        const data = await res.json().catch(() => null);
        if (data && typeof data.reply === "string") reply = data.reply;
        if (data && Array.isArray(data.actions)) actions = data.actions.filter((a: DonateAction) => a && a.type === "donate");
      } catch {
        // Network failure: keep the fallback reply.
      }
      this.messages.push({ role: "assistant", content: reply, actions });
      this.loading = false;
      this.focusAndScroll();
    },
    hrefFor(a: DonateAction): string {
      return stripeLinkFor(a.frequency, a.amount) || `/donate?freq=${a.frequency}&amount=${a.amount}`;
    },
    labelFor(a: DonateAction): string {
      if (a.amount === "custom") return "Donate an amount you choose";
      return `Donate ${donationCurrency}${a.amount}${a.frequency === "monthly" ? " a month" : ""}`;
    },
    subFor(a: DonateAction): string {
      return stripeLinkFor(a.frequency, a.amount) ? "Secure checkout on Stripe" : "Opens the donate page";
    }
  }
});
</script>

<style scoped>
.assistant {
  --orange: #ff913d;
  --orange-2: #ffaf57;
  --ink: #1a0e05;
  --panel: #141414;
  --panel-2: #1d1d1d;
  --line: rgba(255, 255, 255, 0.1);
  --muted: rgba(255, 255, 255, 0.62);
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  font-family: "Manrope", Helvetica, Arial, sans-serif;
  color: #fff;
}

.launcher {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 52px;
  min-width: 52px;
  padding: 0 20px;
  border: 0;
  border-radius: 26px;
  background: linear-gradient(135deg, var(--orange) 0%, var(--orange-2) 100%);
  color: var(--ink);
  font: 600 15px/1 "Manrope", Helvetica, Arial, sans-serif;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(255, 145, 61, 0.3);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.open .launcher { padding: 0; justify-content: center; }
.launcher:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(255, 145, 61, 0.4); }
.launcher:focus-visible, .icon-btn:focus-visible, .send:focus-visible, .starters button:focus-visible, .donate-card:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.launcher svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }

.panel {
  width: min(380px, calc(100vw - 32px));
  height: min(560px, calc(100vh - 110px));
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(90% 50% at 100% 0%, rgba(255, 145, 61, 0.12), transparent 60%),
    var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  animation: rise 0.18s ease-out;
}
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px 14px 16px;
  border-bottom: 1px solid var(--line);
}
.head-icon { width: 34px; height: 34px; }
.head-text { flex: 1; min-width: 0; }
.head-text h2 { margin: 0; font: 400 18px/1.2 "Funnel Display", "Manrope", Helvetica, Arial, sans-serif; }
.head-text p { margin: 2px 0 0; font-size: 12.5px; color: var(--muted); }
.icon-btn {
  width: 34px; height: 34px;
  display: grid; place-items: center;
  border: 0; border-radius: 10px;
  background: transparent; color: var(--muted);
  cursor: pointer;
}
.icon-btn:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.icon-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.log {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}
.msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 14.5px; line-height: 1.5; }
.msg p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.assistant-msg { align-self: flex-start; background: var(--panel-2); border: 1px solid var(--line); border-bottom-left-radius: 6px; }
.user-msg { align-self: flex-end; background: rgba(255, 145, 61, 0.16); border: 1px solid rgba(255, 145, 61, 0.3); border-bottom-right-radius: 6px; }

.typing { display: inline-flex; gap: 5px; padding: 14px; }
.typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); animation: blink 1.2s infinite ease-in-out; }
.typing span:nth-child(2) { animation-delay: 0.15s; }
.typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }

.starters { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-top: 4px; }
.starters button {
  padding: 8px 14px;
  border: 1px solid rgba(255, 145, 61, 0.45);
  border-radius: 999px;
  background: transparent;
  color: var(--orange-2);
  font: 500 13.5px/1.3 "Manrope", Helvetica, Arial, sans-serif;
  cursor: pointer;
  text-align: left;
}
.starters button:hover { background: rgba(255, 145, 61, 0.1); }

.donate-card {
  align-self: flex-start;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  column-gap: 14px;
  width: 85%;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--orange) 0%, var(--orange-2) 100%);
  color: var(--ink);
  text-decoration: none;
  transition: transform 0.15s ease;
}
.donate-card:hover { transform: translateY(-1px); }
.card-label { font-weight: 700; font-size: 15px; }
.card-sub { grid-row: 2; font-size: 12.5px; opacity: 0.8; }
.card-arrow { grid-row: 1 / span 2; grid-column: 2; width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

.composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 12px 6px;
  border-top: 1px solid var(--line);
}
.composer textarea {
  flex: 1;
  resize: none;
  max-height: 120px;
  padding: 11px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel-2);
  color: #fff;
  font: 400 14.5px/1.4 "Manrope", Helvetica, Arial, sans-serif;
}
.composer textarea:focus { outline: none; border-color: rgba(255, 145, 61, 0.6); }
.send {
  width: 42px; height: 42px;
  display: grid; place-items: center;
  border: 0; border-radius: 12px;
  background: var(--orange); color: var(--ink);
  cursor: pointer;
}
.send:disabled { opacity: 0.4; cursor: default; }
.send svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.fineprint { margin: 0; padding: 0 16px 12px; font-size: 11px; color: var(--muted); }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@media (max-width: 480px) {
  .assistant { right: 12px; bottom: 12px; }
  .launcher span { display: none; }
  .launcher { padding: 0; justify-content: center; }
  .panel { width: calc(100vw - 24px); height: calc(100vh - 88px); }
}

@media (prefers-reduced-motion: reduce) {
  .panel, .typing span { animation: none; }
  .launcher, .donate-card { transition: none; }
}
</style>
