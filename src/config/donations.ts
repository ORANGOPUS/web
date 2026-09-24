/*
  Stripe donation settings.

  Donations use Stripe Payment Links, which are public URLs, so no Stripe secret key is
  ever needed in this app. Never add a secret key (sk_live_… / sk_test_…) here or to any
  VUE_APP_* variable: everything prefixed VUE_APP_ is bundled into the public site.

  Set these in .env.local (local) or in the Vercel/Netlify project settings (deployed):

    VUE_APP_DONATION_CURRENCY=£
    VUE_APP_STRIPE_ONCE_5=https://buy.stripe.com/...
    VUE_APP_STRIPE_ONCE_25=https://buy.stripe.com/...
    VUE_APP_STRIPE_ONCE_100=https://buy.stripe.com/...
    VUE_APP_STRIPE_ONCE_CUSTOM=https://buy.stripe.com/...   ("Customers choose what to pay")
    VUE_APP_STRIPE_MONTHLY_5=https://buy.stripe.com/...
    VUE_APP_STRIPE_MONTHLY_25=https://buy.stripe.com/...
    VUE_APP_STRIPE_MONTHLY_100=https://buy.stripe.com/...

  In each Payment Link's "After payment" settings, redirect to https://<your-domain>/donate/thanks
  Any option left unset shows a "not switched on yet" notice instead of sending people anywhere.
*/

export type DonationFrequency = "once" | "monthly";
export type DonationAmount = "5" | "25" | "100" | "custom";

export interface DonationTier {
  amount: DonationAmount;
  name: string;
  impactOnce: string;
  impactMonthly: string;
}

export const donationCurrency: string = process.env.VUE_APP_DONATION_CURRENCY || "£";

export const stripeLinks: Record<DonationFrequency, Partial<Record<DonationAmount, string>>> = {
  once: {
    "5": process.env.VUE_APP_STRIPE_ONCE_5,
    "25": process.env.VUE_APP_STRIPE_ONCE_25,
    "100": process.env.VUE_APP_STRIPE_ONCE_100,
    custom: process.env.VUE_APP_STRIPE_ONCE_CUSTOM
  },
  monthly: {
    "5": process.env.VUE_APP_STRIPE_MONTHLY_5,
    "25": process.env.VUE_APP_STRIPE_MONTHLY_25,
    "100": process.env.VUE_APP_STRIPE_MONTHLY_100
    // Stripe Payment Links can't take a custom recurring amount, so there is no monthly "custom".
  }
};

export const donationTiers: DonationTier[] = [
  {
    amount: "5",
    name: "Low Earth Orbit",
    impactOnce: "buys a printed star chart and red-light torch for a young stargazer.",
    impactMonthly: "keeps a loan telescope in service at a partner school all year."
  },
  {
    amount: "25",
    name: "Lunar",
    impactOnce: "funds a telescope night for a class of ten, with a guide and hot chocolate.",
    impactMonthly: "runs a monthly astronomy club for one community group."
  },
  {
    amount: "100",
    name: "Deep Space",
    impactOnce: "sends a school group to a planetarium show, travel included.",
    impactMonthly: "funds a full term of outreach visits to schools that rarely get them."
  }
];

export function stripeLinkFor(frequency: DonationFrequency, amount: DonationAmount): string | null {
  const url = stripeLinks[frequency][amount];
  return url && /^https:\/\/(buy|donate)\.stripe\.com\//.test(url) ? url : null;
}
