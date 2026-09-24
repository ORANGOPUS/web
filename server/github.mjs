/*
  Read-only GitHub data for the Orangopus organisation: public repos, recent activity,
  and a single repo's README (for the project writer agent).

  Environment (server-side only):
    GITHUB_ORG     optional, defaults to "orangopus".
    GITHUB_TOKEN   optional. A fine-grained token with public read access raises GitHub's
                   rate limit from 60 to 5,000 requests an hour. Never prefix it with VUE_APP_.
*/

const API = "https://api.github.com";
const CACHE_MS = 10 * 60 * 1000;
const README_CHARS = 12000;

export function githubOrg() {
  return (process.env.GITHUB_ORG || "orangopus").trim();
}

const cache = new Map();

async function gh(path, { accept = "application/vnd.github+json", text = false } = {}) {
  const key = `${accept}:${path}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const headers = { Accept: accept, "User-Agent": "orangopus-web", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`${API}${path}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
  const value = text ? await res.text() : await res.json();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.clear();
  return value;
}

function mapRepo(r) {
  return {
    name: r.name,
    full_name: r.full_name,
    description: r.description || "",
    url: r.html_url,
    homepage: r.homepage || "",
    language: r.language || "",
    topics: r.topics || [],
    stars: r.stargazers_count,
    forks: r.forks_count,
    open_issues: r.open_issues_count,
    pushed_at: r.pushed_at
  };
}

/** Public, non-archived repos of the org, most recently pushed first. */
export async function getOrgRepos() {
  const repos = (await gh(`/orgs/${encodeURIComponent(githubOrg())}/repos?type=public&sort=pushed&per_page=50`)) || [];
  return repos.filter(r => !r.archived && !r.fork).map(mapRepo);
}

function describeEvent(e) {
  const p = e.payload || {};
  switch (e.type) {
    case "PushEvent": {
      const n = p.size ?? p.commits?.length ?? 0;
      const msg = p.commits?.[p.commits.length - 1]?.message?.split("\n")[0];
      return { kind: "push", title: msg ? `${n > 1 ? `${n} commits: ` : ""}${msg}` : `Pushed ${n} commit${n === 1 ? "" : "s"}`, url: `https://github.com/${e.repo.name}/commits` };
    }
    case "PullRequestEvent":
      return { kind: "pull_request", title: `${p.action === "closed" && p.pull_request?.merged ? "Merged" : cap(p.action)} PR: ${p.pull_request?.title}`, url: p.pull_request?.html_url };
    case "IssuesEvent":
      return { kind: "issue", title: `${cap(p.action)} issue: ${p.issue?.title}`, url: p.issue?.html_url };
    case "ReleaseEvent":
      return { kind: "release", title: `Released ${p.release?.name || p.release?.tag_name}`, url: p.release?.html_url };
    case "CreateEvent":
      return p.ref_type === "repository" ? { kind: "create", title: "Created the repository", url: `https://github.com/${e.repo.name}` } : null;
    default:
      return null;
  }
}

function cap(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Recent public activity across the org, newest first. */
export async function getOrgActivity(limit = 12) {
  const events = (await gh(`/orgs/${encodeURIComponent(githubOrg())}/events?per_page=50`)) || [];
  const out = [];
  for (const e of events) {
    const d = describeEvent(e);
    if (!d || !d.url) continue;
    out.push({ ...d, repo: e.repo.name, actor: e.actor?.display_login || e.actor?.login, actor_avatar: e.actor?.avatar_url, created_at: e.created_at });
    if (out.length >= limit) break;
  }
  return out;
}

/** Accepts "owner/repo" or a github.com URL. Returns "owner/repo" or null. */
export function parseRepo(input) {
  if (typeof input !== "string") return null;
  const m = input.trim().match(/^(?:https?:\/\/(?:www\.)?github\.com\/)?([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:[/#?].*)?$/);
  if (!m) return null;
  const name = m[2].replace(/\.git$/, "");
  return name && name !== "." && name !== ".." ? `${m[1]}/${name}` : null;
}

/** Repo metadata, languages and README text for one public repo. */
export async function getRepoOverview(fullName) {
  const repo = await gh(`/repos/${fullName}`);
  if (!repo || repo.private) return null;
  const [languages, readme] = await Promise.all([
    gh(`/repos/${fullName}/languages`).catch(() => ({})),
    gh(`/repos/${fullName}/readme`, { accept: "application/vnd.github.raw+json", text: true }).catch(() => null)
  ]);
  return {
    ...mapRepo(repo),
    languages: Object.keys(languages || {}),
    readme: readme ? readme.slice(0, README_CHARS) : ""
  };
}

/** GET /api/github: the org's repos and recent activity for the Open source section. */
export async function handleGitHubRequest() {
  try {
    const [repos, activity] = await Promise.all([getOrgRepos(), getOrgActivity().catch(() => [])]);
    return { status: 200, body: { org: githubOrg(), repos, activity } };
  } catch (err) {
    console.error("[github]", err.message);
    return { status: 502, body: { error: "upstream", org: githubOrg(), repos: [], activity: [] } };
  }
}
