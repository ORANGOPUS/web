# Orangopus on Supabase

Everything the site stores (member profiles, projects, the community feed, likes, comments,
team, FAQs) lives in one Supabase project. The site works without it; sign-in, projects and
the feed switch on once these steps are done.

## 1. Create the database

1. Create a project at supabase.com.
2. In **SQL editor**, run `migrations/20260924000000_orangopus_mvp.sql`, then `seed.sql`.
   (With the Supabase CLI: `supabase link` then `supabase db push` and `supabase db seed`.)
3. To make yourself an admin (can feature projects and edit team, FAQs and settings), sign in
   once on the site, then run:
   `update public.users set is_admin = true where github_username = 'Cheesiq';`

## 2. Turn on sign-in

- **Authentication > Providers > GitHub**: enable it with a GitHub OAuth app. The OAuth app's
  callback URL is the one Supabase shows on that page.
- **Authentication > URL configuration**: set the Site URL to the public site address and add
  `https://*--orangopus-web.netlify.app/**` to the redirect URLs so deploy previews work.

## 3. Hosting environment variables (Netlify: Project configuration > Environment variables)

| Name | Where it's used | Secret? |
| --- | --- | --- |
| `VUE_APP_SUPABASE_URL` | Browser and server functions | No |
| `VUE_APP_SUPABASE_ANON_KEY` | Browser and server functions | No (public, protected by row-level security) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional. Server functions log agent usage to `agent_runs` | **Yes**, never prefix with `VUE_APP_` |
| `ANTHROPIC_API_KEY` | The helper agent and the project writer | **Yes** |
| `GITHUB_TOKEN` | Optional. Raises GitHub's rate limit for the Open source section | **Yes** |
| `GITHUB_ORG` | Optional. GitHub organisation to show, defaults to `orangopus` | No |

Redeploy after changing them: `VUE_APP_*` values are baked into the site at build time.

## What's in the schema

- `users`: one profile per sign-up, filled from GitHub or the sign-up form by a trigger.
- `projects`, `project_likes`: members' projects. Drafts are private; published ones are public.
- `community_posts`, `post_likes`, `post_comments`: the community feed.
- `team_members`, `faqs`, `sections`, `site_settings`: site content, editable by admins.
- `dev_tool_integrations`: which GitHub account a member linked (never tokens).
- `agent_runs`: one row per agent reply (agent name, tools used, token counts; no message text).

Like and comment counts are kept by triggers, and members can't edit counters, the
`featured` flag or their own admin flag.
