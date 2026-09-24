<template>
  <section class="open-source" aria-labelledby="open-source-title">
    <div class="os-inner">
      <p class="eyebrow">Built in the open</p>
      <h2 id="open-source-title">What we're building on GitHub</h2>
      <p class="lede">
        Everything Orangopus makes is open source. Pick a repo, read the code, open an issue or send a pull request.
      </p>

      <div v-if="loading" class="state">Loading our repositories…</div>
      <div v-else-if="!repos.length" class="state">
        Our repositories will show here soon. Meanwhile, find us at
        <a :href="orgUrl" target="_blank" rel="noopener">github.com/{{ org }}</a>.
      </div>

      <div v-else class="os-grid">
        <div class="repos">
          <a v-for="repo in repos.slice(0, 6)" :key="repo.full_name" class="repo" :href="repo.url" target="_blank" rel="noopener">
            <span class="repo-name">{{ repo.name }}</span>
            <span class="repo-desc">{{ repo.description || "No description yet." }}</span>
            <span class="repo-meta">
              <span v-if="repo.language" class="lang"><i :style="{ background: langColour(repo.language) }"></i>{{ repo.language }}</span>
              <span>★ {{ repo.stars }}</span>
              <span v-if="repo.open_issues">{{ repo.open_issues }} open issue{{ repo.open_issues === 1 ? "" : "s" }}</span>
              <span>Updated {{ ago(repo.pushed_at) }}</span>
            </span>
          </a>
        </div>

        <aside v-if="activity.length" class="activity" aria-label="Recent activity">
          <h3>Latest activity</h3>
          <ol>
            <li v-for="(a, i) in activity.slice(0, 8)" :key="i">
              <img v-if="a.actor_avatar" :src="a.actor_avatar + '&s=48'" alt="" width="24" height="24" loading="lazy" />
              <div>
                <a :href="a.url" target="_blank" rel="noopener">{{ a.title }}</a>
                <span class="when">{{ a.actor }} in {{ a.repo.split("/")[1] }} · {{ ago(a.created_at) }}</span>
              </div>
            </li>
          </ol>
        </aside>
      </div>

      <a v-if="repos.length" class="all-link" :href="orgUrl" target="_blank" rel="noopener">See all on GitHub</a>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";

interface Repo {
  name: string;
  full_name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  open_issues: number;
  pushed_at: string;
}

interface Activity {
  kind: string;
  title: string;
  url: string;
  repo: string;
  actor: string;
  actor_avatar?: string;
  created_at: string;
}

const LANG_COLOURS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Vue: "#41b883",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  HTML: "#e34c26",
  CSS: "#563d7c"
};

export default defineComponent({
  name: "OpenSourceSection",
  data() {
    return {
      loading: true,
      org: "orangopus",
      repos: [] as Repo[],
      activity: [] as Activity[]
    };
  },
  computed: {
    orgUrl(): string {
      return `https://github.com/${this.org}`;
    }
  },
  async mounted() {
    try {
      const res = await fetch("/api/github");
      const data = await res.json();
      if (typeof data.org === "string") this.org = data.org;
      this.repos = Array.isArray(data.repos) ? data.repos : [];
      this.activity = Array.isArray(data.activity) ? data.activity : [];
    } catch {
      // Leave the empty state with the GitHub link.
    } finally {
      this.loading = false;
    }
  },
  methods: {
    langColour(lang: string): string {
      return LANG_COLOURS[lang] || "#ff913d";
    },
    ago(iso: string): string {
      const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
      if (days <= 0) return "today";
      if (days === 1) return "yesterday";
      if (days < 30) return `${days} days ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
      const years = Math.floor(days / 365);
      return `${years} year${years === 1 ? "" : "s"} ago`;
    }
  }
});
</script>

<style scoped>
.open-source {
  padding: 100px 40px;
}
.os-inner {
  max-width: 1200px;
  margin: 0 auto;
}
.eyebrow {
  color: #ff913d;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 13px;
  margin-bottom: 12px;
}
h2 {
  font-family: "Funnel Display", "Manrope", Helvetica, sans-serif;
  font-size: clamp(32px, 4.5vw, 52px);
  line-height: 1.1;
  margin-bottom: 16px;
}
.lede {
  color: rgba(255, 255, 255, 0.72);
  font-size: 18px;
  max-width: 640px;
  line-height: 1.6;
  margin-bottom: 40px;
}
.state {
  color: rgba(255, 255, 255, 0.72);
  padding: 32px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}
.state a,
.all-link {
  color: #ff913d;
}
.os-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 24px;
}
.repos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.repo {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  text-decoration: none;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.repo:hover {
  border-color: rgba(255, 145, 61, 0.6);
  transform: translateY(-2px);
}
.repo-name {
  font-weight: 700;
  font-size: 18px;
}
.repo-desc {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 1.5;
  flex: 1;
}
.repo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
}
.lang {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lang i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.activity {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 145, 61, 0.06);
  border: 1px solid rgba(255, 145, 61, 0.25);
}
.activity h3 {
  font-size: 16px;
  margin-bottom: 16px;
}
.activity ol {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.activity li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.activity img {
  border-radius: 50%;
  flex-shrink: 0;
}
.activity a {
  color: #fff;
  font-size: 14px;
  line-height: 1.4;
  text-decoration: none;
  display: block;
  overflow-wrap: anywhere;
}
.activity a:hover {
  color: #ff913d;
}
.when {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}
.all-link {
  display: inline-block;
  margin-top: 28px;
  font-weight: 600;
}
@media (max-width: 900px) {
  .open-source {
    padding: 72px 16px;
  }
  .os-grid {
    grid-template-columns: 1fr;
  }
}
</style>
