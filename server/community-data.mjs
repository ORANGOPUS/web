/*
  Server-side reads from Supabase for the agents. Uses the public anon key, so row-level
  security applies exactly as it does in the browser: the agents only see published projects
  and public posts.

  Environment:
    VUE_APP_SUPABASE_URL, VUE_APP_SUPABASE_ANON_KEY   the same public values the site uses.
    SUPABASE_SERVICE_ROLE_KEY   optional, server-side only. When set, each agent reply is
                                logged to the agent_runs table (no message text is stored).
*/

import { createClient } from "@supabase/supabase-js";

let publicClient;
let serviceClient;

function url() {
  return process.env.VUE_APP_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function isCommunityDataConfigured() {
  return Boolean(url() && (process.env.VUE_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY));
}

function db() {
  if (!isCommunityDataConfigured()) return null;
  publicClient ??= createClient(url(), process.env.VUE_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return publicClient;
}

const NOT_CONNECTED = { error: "The community database isn't connected yet, so there are no member projects or posts to show." };

export async function searchProjects(query, limit = 5) {
  const client = db();
  if (!client) return NOT_CONNECTED;
  let q = client
    .from("projects")
    .select("title, slug, description, technologies, category, github_url, live_url, likes_count, users:user_id ( name )")
    .eq("status", "published")
    .order("likes_count", { ascending: false })
    .limit(limit);
  const term = String(query || "").replace(/[%,()*]/g, " ").trim().slice(0, 80);
  if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) return { error: error.message };
  return {
    projects: (data || []).map(p => ({
      title: p.title,
      page: `/project/${p.slug}`,
      by: p.users?.name || "a member",
      description: (p.description || "").slice(0, 400),
      technologies: p.technologies,
      category: p.category,
      github_url: p.github_url,
      live_url: p.live_url,
      likes: p.likes_count
    }))
  };
}

export async function recentPosts(limit = 5) {
  const client = db();
  if (!client) return NOT_CONNECTED;
  const { data, error } = await client
    .from("community_posts")
    .select("user_name, content, post_type, tags, likes_count, comments_count, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 10));
  if (error) return { error: error.message };
  return {
    posts: (data || []).map(p => ({ ...p, content: p.content.slice(0, 300) }))
  };
}

/** Fire-and-forget usage log. Silently does nothing without the service role key. */
export function logAgentRun({ agent, toolsUsed = [], usage, inputSummary }) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !url()) return;
  serviceClient ??= createClient(url(), key, { auth: { persistSession: false, autoRefreshToken: false } });
  serviceClient
    .from("agent_runs")
    .insert({
      agent,
      tools_used: toolsUsed,
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null,
      input_summary: inputSummary || null
    })
    .then(({ error }) => error && console.error("[agent_runs]", error.message));
}
