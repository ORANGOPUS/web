<template>
  <div class="thanks-page">
    <main class="thanks-main">
      <span class="eyebrow">Donation received</span>
      <h1>Thank you. <span class="glow">You're part of the crew.</span></h1>
      <p class="lede">
        Your gift is on its way. Stripe has emailed you a receipt, and we'll let you know what
        your support helps launch.
      </p>
      <div class="actions">
        <router-link to="/" class="btn">Back to home</router-link>
        <router-link to="/donate" class="btn btn-ghost">Make another donation</router-link>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "DonateThanks",
  mounted() {
    document.title = "Thank you - Orangopus";
  }
});
</script>

<style scoped>
.thanks-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 80px clamp(16px, 4vw, 40px);
  color: #ffffff;
  font-family: "Manrope", Helvetica, Arial, sans-serif;
  background:
    radial-gradient(70% 60% at 50% 0%, rgba(255, 145, 60, 0.16), transparent 60%),
    linear-gradient(135deg, #0a0a0a 0%, #151515 50%, #0a0a0a 100%);
}

.thanks-main {
  display: grid;
  gap: 20px;
  max-width: 760px;
}

.eyebrow {
  color: #ff913c;
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  font-family: "Funnel Display", "Manrope", Helvetica, Arial, sans-serif;
  font-size: clamp(38px, 6vw, 64px);
  font-weight: 400;
  line-height: 1.05;
  text-wrap: balance;
}

.glow {
  color: #ff913c;
}

.lede {
  color: rgba(255, 255, 255, 0.72);
  font-size: 19px;
  line-height: 1.55;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  padding: 14px 24px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff913c 0%, #ffaf57 100%);
  color: #1a0e05;
  font-weight: 700;
  text-decoration: none;
}

.btn-ghost {
  background: transparent;
  color: #ffffff;
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.25);
}
</style>
