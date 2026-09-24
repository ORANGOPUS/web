-- Orangopus MVP schema.
--
-- One migration for every table the site reads or writes (src/services/*).
-- Safe to run on a fresh Supabase project: `supabase db push`, or paste it into
-- the SQL editor. Starter content lives in supabase/seed.sql.
--
-- Counters (likes, comments) are kept in step by triggers, so the browser never
-- writes them directly.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(value text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Members (one row per auth user)
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  github_username text,
  bio text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.users is 'Public member profiles, created automatically on sign-up.';

-- Fills the profile from sign-up data. GitHub sign-in provides user_name,
-- full_name and avatar_url; email sign-up provides name.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name, avatar_url, github_username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'user_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- Members can't make themselves admins.
create or replace function public.protect_admin_flag()
returns trigger language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin and current_user in ('authenticated', 'anon') then
    new.is_admin = old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists users_protect_admin on public.users;
create trigger users_protect_admin before update on public.users
  for each row execute function public.protect_admin_flag();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  slug text unique,
  description text not null default '',
  image_url text,
  github_url text,
  live_url text,
  technologies text[] not null default '{}',
  category text,
  difficulty_level text check (difficulty_level in ('beginner', 'intermediate', 'advanced')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  likes_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_status_created_idx on public.projects(status, created_at desc);

create or replace function public.set_project_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug = nullif(public.slugify(new.title), '') || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  return new;
end;
$$;

drop trigger if exists projects_slug on public.projects;
create trigger projects_slug before insert on public.projects
  for each row execute function public.set_project_slug();

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- Only admins can feature a project; counters only move through triggers.
create or replace function public.protect_project_fields()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.likes_count = 0;
      new.views_count = 0;
      if not public.is_admin() then new.featured = false; end if;
    else
      new.likes_count = old.likes_count;
      new.views_count = old.views_count;
      if not public.is_admin() then new.featured = old.featured; end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_protect on public.projects;
create trigger projects_protect before insert or update on public.projects
  for each row execute function public.protect_project_fields();

create table if not exists public.project_likes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create or replace function public.sync_project_likes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.projects
     set likes_count = (select count(*) from public.project_likes where project_id = coalesce(new.project_id, old.project_id))
   where id = coalesce(new.project_id, old.project_id);
  return null;
end;
$$;

drop trigger if exists project_likes_sync on public.project_likes;
create trigger project_likes_sync after insert or delete on public.project_likes
  for each row execute function public.sync_project_likes();

create or replace function public.increment_project_views(project_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.projects set views_count = views_count + 1
   where id = increment_project_views.project_id and status = 'published';
end;
$$;

-- ---------------------------------------------------------------------------
-- Community feed
-- ---------------------------------------------------------------------------

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  user_name text not null,
  user_avatar text,
  content text not null check (char_length(content) between 1 and 5000),
  post_type text not null default 'discussion' check (post_type in ('project', 'question', 'showcase', 'discussion')),
  tags text[] not null default '{}',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  github_repo jsonb,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_created_idx on public.community_posts(created_at desc);
create index if not exists community_posts_tags_idx on public.community_posts using gin(tags);

drop trigger if exists community_posts_updated_at on public.community_posts;
create trigger community_posts_updated_at before update on public.community_posts
  for each row execute function public.set_updated_at();

create or replace function public.protect_post_counters()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.likes_count = 0;
      new.comments_count = 0;
    else
      new.likes_count = old.likes_count;
      new.comments_count = old.comments_count;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists community_posts_protect on public.community_posts;
create trigger community_posts_protect before insert or update on public.community_posts
  for each row execute function public.protect_post_counters();

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  user_name text not null,
  user_avatar text,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create or replace function public.sync_post_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.post_id, old.post_id);
begin
  update public.community_posts set
    likes_count = (select count(*) from public.post_likes where post_id = target),
    comments_count = (select count(*) from public.post_comments where post_id = target)
  where id = target;
  return null;
end;
$$;

drop trigger if exists post_likes_sync on public.post_likes;
create trigger post_likes_sync after insert or delete on public.post_likes
  for each row execute function public.sync_post_counts();

drop trigger if exists post_comments_sync on public.post_comments;
create trigger post_comments_sync after insert or delete on public.post_comments
  for each row execute function public.sync_post_counts();

-- ---------------------------------------------------------------------------
-- Site content (edited by admins in the Supabase dashboard)
-- ---------------------------------------------------------------------------

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null,
  section_key text not null,
  title text,
  subtitle text,
  content text,
  image_url text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  unique (page_slug, section_key)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  bio text,
  avatar_url text,
  github_url text,
  linkedin_url text,
  twitter_url text,
  order_index integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'general',
  order_index integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text,
  description text
);

-- ---------------------------------------------------------------------------
-- Dev tool connections (which GitHub account a member linked)
-- ---------------------------------------------------------------------------

create table if not exists public.dev_tool_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null check (platform in ('github', 'gitlab', 'bitbucket', 'vercel', 'netlify')),
  username text not null,
  avatar_url text,
  repositories jsonb not null default '[]',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);
comment on table public.dev_tool_integrations is 'Never store access tokens here: it is readable by its owner from the browser.';

-- ---------------------------------------------------------------------------
-- Agent activity (written by the server functions with the service role key)
-- ---------------------------------------------------------------------------

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  user_id uuid references public.users(id) on delete set null,
  input_summary text,
  tools_used text[] not null default '{}',
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
comment on table public.agent_runs is 'One row per agent reply, for usage tracking. No message text is stored.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_likes enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.sections enable row level security;
alter table public.team_members enable row level security;
alter table public.faqs enable row level security;
alter table public.site_settings enable row level security;
alter table public.dev_tool_integrations enable row level security;
alter table public.agent_runs enable row level security;

drop policy if exists "profiles are public" on public.users;
create policy "profiles are public" on public.users for select using (true);
drop policy if exists "members edit own profile" on public.users;
create policy "members edit own profile" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "published projects are public" on public.projects;
create policy "published projects are public" on public.projects for select
  using (status = 'published' or auth.uid() = user_id or public.is_admin());
drop policy if exists "members add own projects" on public.projects;
create policy "members add own projects" on public.projects for insert with check (auth.uid() = user_id);
drop policy if exists "members edit own projects" on public.projects;
create policy "members edit own projects" on public.projects for update
  using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "members delete own projects" on public.projects;
create policy "members delete own projects" on public.projects for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists "project likes are public" on public.project_likes;
create policy "project likes are public" on public.project_likes for select using (true);
drop policy if exists "members like" on public.project_likes;
create policy "members like" on public.project_likes for insert with check (auth.uid() = user_id);
drop policy if exists "members unlike" on public.project_likes;
create policy "members unlike" on public.project_likes for delete using (auth.uid() = user_id);

drop policy if exists "posts are public" on public.community_posts;
create policy "posts are public" on public.community_posts for select using (true);
drop policy if exists "members post" on public.community_posts;
create policy "members post" on public.community_posts for insert with check (auth.uid() = user_id);
drop policy if exists "members edit own posts" on public.community_posts;
create policy "members edit own posts" on public.community_posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "members delete own posts" on public.community_posts;
create policy "members delete own posts" on public.community_posts for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists "post likes are public" on public.post_likes;
create policy "post likes are public" on public.post_likes for select using (true);
drop policy if exists "members like posts" on public.post_likes;
create policy "members like posts" on public.post_likes for insert with check (auth.uid() = user_id);
drop policy if exists "members unlike posts" on public.post_likes;
create policy "members unlike posts" on public.post_likes for delete using (auth.uid() = user_id);

drop policy if exists "comments are public" on public.post_comments;
create policy "comments are public" on public.post_comments for select using (true);
drop policy if exists "members comment" on public.post_comments;
create policy "members comment" on public.post_comments for insert with check (auth.uid() = user_id);
drop policy if exists "members delete own comments" on public.post_comments;
create policy "members delete own comments" on public.post_comments for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists "sections are public" on public.sections;
create policy "sections are public" on public.sections for select using (is_active or public.is_admin());
drop policy if exists "admins manage sections" on public.sections;
create policy "admins manage sections" on public.sections for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "team is public" on public.team_members;
create policy "team is public" on public.team_members for select using (is_active or public.is_admin());
drop policy if exists "admins manage team" on public.team_members;
create policy "admins manage team" on public.team_members for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "faqs are public" on public.faqs;
create policy "faqs are public" on public.faqs for select using (is_active or public.is_admin());
drop policy if exists "admins manage faqs" on public.faqs;
create policy "admins manage faqs" on public.faqs for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings are public" on public.site_settings;
create policy "settings are public" on public.site_settings for select using (true);
drop policy if exists "admins manage settings" on public.site_settings;
create policy "admins manage settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "members see own connections" on public.dev_tool_integrations;
create policy "members see own connections" on public.dev_tool_integrations for select using (auth.uid() = user_id);
drop policy if exists "members manage own connections" on public.dev_tool_integrations;
create policy "members manage own connections" on public.dev_tool_integrations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- agent_runs: no policies, so only the service role (server functions) can read or write it.
drop policy if exists "admins read agent runs" on public.agent_runs;
create policy "admins read agent runs" on public.agent_runs for select using (public.is_admin());

grant execute on function public.increment_project_views(uuid) to anon, authenticated;
