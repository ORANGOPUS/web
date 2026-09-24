<template>
  <div class="donate-page">
    <header class="donate-top">
      <router-link to="/" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to home
      </router-link>
    </header>

    <main class="donate-main">
      <section class="intro">
        <span class="eyebrow">Donate</span>
        <h1>Fund a mission</h1>
        <p class="lede">
          Choose how often and how much. You'll finish on Stripe's secure checkout, which takes
          cards, Apple Pay and Google Pay.
        </p>
      </section>

      <div class="donate-grid">
        <form class="console" @submit.prevent="donate" novalidate>
          <fieldset>
            <legend>How often</legend>
            <div class="freq">
              <input id="freq-once" v-model="frequency" type="radio" value="once" />
              <label for="freq-once">One-off</label>
              <input id="freq-monthly" v-model="frequency" type="radio" value="monthly" />
              <label for="freq-monthly">Monthly</label>
            </div>
          </fieldset>

          <fieldset>
            <legend>How much</legend>
            <div class="amounts">
              <div v-for="tier in tiers" :key="tier.amount" class="amount-opt">
                <input :id="'amt-' + tier.amount" v-model="amount" type="radio" :value="tier.amount" />
                <label :for="'amt-' + tier.amount">
                  <span class="val">{{ currency }}{{ tier.amount }}</span>
                  <span class="orbit-name">{{ tier.name }}</span>
                </label>
              </div>
              <div class="amount-opt" :class="{ disabled: frequency === 'monthly' }">
                <input
                  id="amt-custom"
                  v-model="amount"
                  type="radio"
                  value="custom"
                  :disabled="frequency === 'monthly'"
                />
                <label for="amt-custom">
                  <span class="val">Other</span>
                  <span class="orbit-name">{{ frequency === 'monthly' ? 'One-off only' : 'Your choice' }}</span>
                </label>
              </div>
            </div>
          </fieldset>

          <p class="impact" aria-live="polite">{{ impactText }}</p>

          <div class="checkout-row">
            <button type="submit" class="donate-submit">{{ buttonLabel }}</button>
            <span class="secure">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" />
              </svg>
              Secure payment by Stripe. We never see your card details.
            </span>
          </div>

          <p v-if="notConfigured" class="notice" role="status">
            Donations aren't switched on for this option yet. Set
            <code>{{ envName }}</code> to its Stripe Payment Link and this button will open
            Stripe's secure checkout.
          </p>
        </form>

        <aside class="side">
          <div class="card">
            <h3>Where it goes</h3>
            <p>
              As a non-profit, every donation goes into supporting our projects, maintaining our
              infrastructure and making creation accessible to everyone.
            </p>
          </div>
          <div class="card">
            <h3>Open and grassroots</h3>
            <p>
              Orangopus is a nonprofit open collective supporting creators of all backgrounds.
              No gatekeepers, no agendas.
            </p>
          </div>
          <div class="card">
            <h3>Monthly giving</h3>
            <p>
              A monthly gift lets us plan ahead. Stripe emails you a link to change or cancel it
              at any time.
            </p>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { LocationQuery } from "vue-router";
import {
  donationCurrency,
  donationTiers,
  stripeLinkFor,
  type DonationAmount,
  type DonationFrequency
} from "@/config/donations";

/** Reads ?freq= and ?amount= into a valid selection, defaulting to a one-off £25. */
function selectionFromQuery(query: LocationQuery): { frequency: DonationFrequency; amount: DonationAmount } {
  const frequency: DonationFrequency = query.freq === "monthly" ? "monthly" : "once";
  const requested = String(query.amount || "");
  const valid: DonationAmount[] = ["5", "25", "100", "custom"];
  let amount: DonationAmount = valid.includes(requested as DonationAmount)
    ? (requested as DonationAmount)
    : "25";
  if (frequency === "monthly" && amount === "custom") amount = "25";
  return { frequency, amount };
}

export default defineComponent({
  name: "DonatePage",
  data() {
    const { frequency, amount } = selectionFromQuery(this.$route?.query || {});
    return {
      frequency,
      amount,
      currency: donationCurrency,
      tiers: donationTiers,
      notConfigured: false
    };
  },
  computed: {
    impactText(): string {
      if (this.amount === "custom") {
        return "You choose the amount on the next screen. Every gift goes straight into our projects and community.";
      }
      const tier = this.tiers.find(t => t.amount === this.amount);
      if (!tier) return "";
      const suffix = this.frequency === "monthly" ? " a month " : " ";
      const impact = this.frequency === "monthly" ? tier.impactMonthly : tier.impactOnce;
      return `${this.currency}${tier.amount}${suffix}${impact}`;
    },
    buttonLabel(): string {
      if (this.amount === "custom") return "Choose amount on Stripe";
      return `Donate ${this.currency}${this.amount}${this.frequency === "monthly" ? " a month" : ""}`;
    },
    envName(): string {
      return `VUE_APP_STRIPE_${this.frequency.toUpperCase()}_${this.amount.toUpperCase()}`;
    }
  },
  watch: {
    "$route.query"(query: LocationQuery) {
      const selection = selectionFromQuery(query);
      this.frequency = selection.frequency;
      this.amount = selection.amount;
    },
    frequency(value: DonationFrequency) {
      if (value === "monthly" && this.amount === "custom") this.amount = "25";
      this.notConfigured = false;
    },
    amount() {
      this.notConfigured = false;
    }
  },
  mounted() {
    document.title = "Donate - Orangopus";
  },
  methods: {
    donate() {
      const url = stripeLinkFor(this.frequency, this.amount);
      if (!url) {
        this.notConfigured = true;
        return;
      }
      window.location.href = url;
    }
  }
});
</script>

<style scoped>
.donate-page {
  min-height: 100vh;
  color: #ffffff;
  font-family: "Manrope", Helvetica, Arial, sans-serif;
  background:
    radial-gradient(80% 60% at 90% 0%, rgba(255, 145, 60, 0.14), transparent 60%),
    linear-gradient(135deg, #0a0a0a 0%, #151515 50%, #0a0a0a 100%);
  padding: 0 clamp(16px, 4vw, 40px) 80px;
}

.donate-top,
.donate-main {
  max-width: 1120px;
  margin: 0 auto;
}

.donate-top {
  padding: 28px 0 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-weight: 500;
}

.back-link:hover {
  color: #ffffff;
}

.back-link svg {
  width: 18px;
  height: 18px;
}

.intro {
  display: grid;
  gap: 16px;
  padding: 56px 0 40px;
}

.eyebrow {
  color: #ff913c;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  font-family: "Funnel Display", "Manrope", Helvetica, Arial, sans-serif;
  font-size: clamp(40px, 7vw, 72px);
  font-weight: 400;
  line-height: 1.02;
  text-wrap: balance;
}

.lede {
  max-width: 60ch;
  color: rgba(255, 255, 255, 0.72);
  font-size: 19px;
  line-height: 1.55;
}

.donate-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr);
  gap: 32px;
  align-items: start;
}

.console {
  display: grid;
  gap: 28px;
  padding: clamp(20px, 4vw, 36px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
}

fieldset {
  border: 0;
  min-width: 0;
}

legend {
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.freq {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.4);
}

.freq input,
.amount-opt input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.freq label {
  padding: 12px 16px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.freq input:checked + label {
  background: linear-gradient(135deg, #ff913c 0%, #ffaf57 100%);
  color: #1a0e05;
}

.freq input:focus-visible + label,
.amount-opt input:focus-visible + label {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

.amounts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.amount-opt label {
  display: grid;
  gap: 4px;
  height: 100%;
  padding: 18px;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.amount-opt label:hover {
  border-color: rgba(255, 255, 255, 0.35);
}

.amount-opt input:checked + label {
  border-color: #ff913c;
  background: rgba(255, 145, 60, 0.1);
}

.amount-opt.disabled label {
  opacity: 0.45;
  cursor: not-allowed;
}

.val {
  font-family: "Funnel Display", "Manrope", Helvetica, Arial, sans-serif;
  font-size: 34px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.amount-opt input:checked + label .val {
  color: #ff913c;
}

.orbit-name {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.impact {
  min-height: 3em;
  padding-left: 16px;
  border-left: 2px solid #ff913c;
  font-size: 19px;
  line-height: 1.45;
}

.checkout-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.donate-submit {
  padding: 16px 28px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff913c 0%, #ffaf57 100%);
  color: #1a0e05;
  font: 700 17px "Manrope", Helvetica, Arial, sans-serif;
  cursor: pointer;
  box-shadow: 0 8px 25px rgba(255, 145, 60, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.donate-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(255, 145, 60, 0.4);
}

.secure {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.secure svg {
  width: 16px;
  height: 16px;
  flex: none;
}

.notice {
  padding: 14px 16px;
  border: 1px dashed #ff913c;
  border-radius: 10px;
  background: rgba(255, 145, 60, 0.08);
  font-size: 14px;
  line-height: 1.5;
}

.notice code {
  color: #ffaf57;
  font-size: 13px;
}

.side {
  display: grid;
  gap: 16px;
}

.card {
  display: grid;
  gap: 8px;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
}

.card h3 {
  font-size: 18px;
  font-weight: 600;
}

.card p {
  color: rgba(255, 255, 255, 0.68);
  font-size: 15px;
  line-height: 1.55;
}

@media (max-width: 880px) {
  .donate-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .amounts {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
</style>
