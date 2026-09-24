# Environment Configuration

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VUE_APP_SUPABASE_URL=your_supabase_project_url
VUE_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# GitHub OAuth (Optional - for GitHub integration)
VUE_APP_GITHUB_CLIENT_ID=your_github_client_id
VUE_APP_GITHUB_CLIENT_SECRET=your_github_client_secret

# App Configuration
VUE_APP_APP_NAME=Opus
VUE_APP_APP_DESCRIPTION=Community-Driven Development Platform
VUE_APP_APP_URL=https://opus.org
```

## Setting up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and anon key from the project settings
3. Create the required tables using the SQL scripts in the root directory

## Setting up GitHub OAuth (Optional)

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set the callback URL to `http://localhost:8080/auth/callback` for development
4. Copy the Client ID and Client Secret to your `.env` file 
## Stripe donations

The `/donate` page sends donors to Stripe Payment Links, so no Stripe secret key is needed.
Never put a secret key (`sk_live_…` / `sk_test_…`) in any `VUE_APP_*` variable: those are bundled into the public site.

Create each link in Stripe Dashboard → Payment Links (fixed one-time price, "customers choose what to pay", or a monthly recurring price),
set its "After payment" redirect to `https://<your-domain>/donate/thanks`, then add:

```
VUE_APP_DONATION_CURRENCY=£
VUE_APP_STRIPE_ONCE_5=https://buy.stripe.com/...
VUE_APP_STRIPE_ONCE_25=https://buy.stripe.com/...
VUE_APP_STRIPE_ONCE_100=https://buy.stripe.com/...
VUE_APP_STRIPE_ONCE_CUSTOM=https://buy.stripe.com/...
VUE_APP_STRIPE_MONTHLY_5=https://buy.stripe.com/...
VUE_APP_STRIPE_MONTHLY_25=https://buy.stripe.com/...
VUE_APP_STRIPE_MONTHLY_100=https://buy.stripe.com/...
```

Test with Stripe test-mode links (`https://buy.stripe.com/test_…`) and card `4242 4242 4242 4242` before switching to live links.
Any option left unset shows a "not switched on yet" notice on the donate page.

## Donation helper (chat assistant)

The "Questions? Ask us" button in the bottom corner of every page opens a chat helper that answers
questions about Orangopus and donating, and shows a donate button for the option that suits the visitor.
It's powered by Claude through the server-side route `/api/assistant` (`server/donation-assistant.mjs`),
so the API key never reaches the browser.

Set these in the Vercel/Netlify project settings (not in any `VUE_APP_*` variable):

```
ANTHROPIC_API_KEY=sk-ant-...        # required; get one at https://console.anthropic.com
ASSISTANT_MODEL=claude-opus-5       # optional
```

Without `ANTHROPIC_API_KEY` the widget still shows, and says the helper isn't switched on yet.
The helper only recommends donation options whose `VUE_APP_STRIPE_*` link is set.

Local development: put `ANTHROPIC_API_KEY` in `.env.local`, then run `npm run dev:assistant`
in one terminal and `npm run dev` in another. The dev server proxies `/api` to the assistant.

The helper's facts about Orangopus live in the system prompt in `server/donation-assistant.mjs`;
edit that text to change what it knows.
