import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { resolveDefaultBranch, fetchRepoTree } from "./lib/github";

// ---------------------------------------------------------------------------
// Technology tagging
// ---------------------------------------------------------------------------

const TECH_KEYWORDS: Record<string, string[]> = {
  react: ["react", "jsx", "hooks"],
  nextjs: ["nextjs", "next-js", "next.js", "vercel"],
  vue: ["vue", "vuejs", "nuxt"],
  svelte: ["svelte", "sveltekit"],
  angular: ["angular"],
  tailwind: ["tailwind", "tailwindcss"],
  typescript: ["typescript"],
  javascript: ["javascript"],
  python: ["python", "django", "flask", "fastapi"],
  supabase: ["supabase"],
  convex: ["convex"],
  prisma: ["prisma"],
  node: ["node", "express", "nestjs", "fastify"],
  postgres: ["postgres", "postgresql"],
  mysql: ["mysql"],
  mongodb: ["mongodb", "mongoose"],
  redis: ["redis"],
  docker: ["docker", "container", "dockerfile"],
  aws: ["aws", "amazon", "s3", "lambda", "dynamodb"],
  gcp: ["gcp", "google-cloud"],
  azure: ["azure"],
  firebase: ["firebase", "firestore"],
  graphql: ["graphql", "apollo"],
  rest: ["rest-api", "openapi", "swagger"],
  rust: ["rust", "cargo"],
  go: ["golang"],
  java: ["java", "spring", "maven", "gradle"],
  ruby: ["ruby", "rails"],
  php: ["php", "laravel"],
  swift: ["swift", "swiftui", "ios"],
  kotlin: ["kotlin", "android"],
  flutter: ["flutter", "dart"],
  css: ["css", "scss", "sass", "less"],
  testing: ["test", "jest", "vitest", "cypress", "playwright"],
  git: ["git", "github", "gitlab"],
  ci: ["ci", "cd", "github-actions", "jenkins"],
  security: ["security", "auth", "oauth", "jwt"],
  ai: ["ai", "ml", "llm", "openai", "anthropic", "claude", "gpt"],
  cursor: ["cursor"],
};

function tagSkill(source: string, skillId: string, name: string): string[] {
  const text = `${source} ${skillId} ${name}`.toLowerCase();
  const tags: string[] = [];

  for (const [tech, keywords] of Object.entries(TECH_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      tags.push(tech);
    }
  }

  return tags;
}

// ---------------------------------------------------------------------------
// Sync actions
// ---------------------------------------------------------------------------

const BATCH_SIZE = 100;
const MIN_INSTALLS = 50;

export const syncSkills = internalAction({
  args: {},
  handler: async (ctx) => {
    let page = 0;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      const url = `https://skills.sh/api/skills/all-time/${page}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed to fetch ${url}: ${res.status}`);
        break;
      }

      const data = (await res.json()) as {
        skills: Array<{
          source: string;
          skillId: string;
          name: string;
          installs: number;
        }>;
        hasMore: boolean;
        total: number;
        page: number;
      };

      // Pick only the fields we need — some leaderboards return extra fields
      // Filter out skills below the minimum install threshold
      const normalized = data.skills
        .filter((s) => s.installs >= MIN_INSTALLS)
        .map((s) => ({
          source: s.source,
          skillId: s.skillId,
          name: s.name,
          installs: s.installs,
        }));

      // If no skills passed the threshold, we've hit the long tail — stop
      if (normalized.length === 0) {
        console.log(`Stopping sync: installs dropped below ${MIN_INSTALLS}`);
        break;
      }

      // Process in batches to stay within Convex mutation limits
      for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
        const batch = normalized.slice(i, i + BATCH_SIZE);
        await ctx.runMutation(internal.skills.upsertSkillsBatch, {
          skills: batch,
          leaderboard: "all-time",
        });
      }

      totalSynced += normalized.length;
      hasMore = data.hasMore;
      page++;
    }

    console.log(`Synced ${totalSynced} skills (min ${MIN_INSTALLS} installs)`);

    // Schedule two-phase content backfill (URL discovery → content fetch)
    await ctx.scheduler.runAfter(10_000, internal.skills.backfillDiscoverUrls, {});
  },
});

export const upsertSkillsBatch = internalMutation({
  args: {
    skills: v.array(
      v.object({
        source: v.string(),
        skillId: v.string(),
        name: v.string(),
        installs: v.number(),
      })
    ),
    leaderboard: v.string(),
  },
  handler: async (ctx, { skills, leaderboard }) => {
    const now = Date.now();

    for (const skill of skills) {
      const existing = await ctx.db
        .query("skills")
        .withIndex("by_source_skillId", (q) =>
          q.eq("source", skill.source).eq("skillId", skill.skillId)
        )
        .unique();

      const technologies = tagSkill(skill.source, skill.skillId, skill.name);

      let skillDocId;

      if (existing) {
        skillDocId = existing._id;
        await ctx.db.patch(existing._id, {
          installs: skill.installs,
          leaderboard,
          technologies,
          lastSynced: now,
        });
      } else {
        skillDocId = await ctx.db.insert("skills", {
          source: skill.source,
          skillId: skill.skillId,
          name: skill.name,
          installs: skill.installs,
          technologies,
          leaderboard,
          lastSynced: now,
        });
      }

      // Sync junction table: delete old entries, insert current ones
      const existingEntries = await ctx.db
        .query("skillTechnologies")
        .withIndex("by_skillId", (q) => q.eq("skillId", skillDocId))
        .collect();
      for (const entry of existingEntries) {
        await ctx.db.delete(entry._id);
      }
      for (const tech of technologies) {
        await ctx.db.insert("skillTechnologies", {
          skillId: skillDocId,
          technology: tech,
          installs: skill.installs,
        });
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Content helpers
// ---------------------------------------------------------------------------

function extractFrontmatterDescription(content: string): string | null {
  // YAML frontmatter is between --- markers
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = match[1];

  // Look for description field in YAML
  const descMatch = frontmatter.match(/^description:\s*["']?([^\s|>].*?)["']?\s*$/m);
  if (descMatch) return descMatch[1].trim();

  // Fallback: try multi-line description
  const multiLineMatch = frontmatter.match(
    /^description:\s*[|>]-?\s*\n([\s\S]*?)(?=\n\w|\n---|\n$)/m
  );
  if (multiLineMatch) {
    return multiLineMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  return null;
}

function extractBodyContent(raw: string): string | null {
  // Strip YAML frontmatter (between --- markers), return remaining markdown body
  const match = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n?([\s\S]*)/);
  if (match) {
    const body = match[1].trim();
    return body || null;
  }
  // No frontmatter — treat the whole content as the body
  const trimmed = raw.trim();
  return trimmed || null;
}

// ---------------------------------------------------------------------------
// Phase 1 — URL Discovery (GitHub Tree API)
// ---------------------------------------------------------------------------

export const listSourcesNeedingDiscovery = internalQuery({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const paginationOpts = cursor
      ? { numItems: 500, cursor }
      : { numItems: 500, cursor: null };
    const result = await ctx.db.query("skills").paginate(paginationOpts);

    // Group skills that need URL discovery by source repo
    const bySource = new Map<
      string,
      Array<{ docId: string; skillId: string }>
    >();
    for (const s of result.page) {
      if (s.skillMdUrl !== undefined && s.skillMdUrl !== "") continue;
      const list = bySource.get(s.source) ?? [];
      list.push({ docId: s._id, skillId: s.skillId });
      bySource.set(s.source, list);
    }

    const sources = Array.from(bySource.entries()).map(
      ([source, skills]) => ({ source, skills })
    );

    return {
      sources,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const discoverSkillMdUrls = internalAction({
  args: {
    source: v.string(),
    skills: v.array(
      v.object({ docId: v.string(), skillId: v.string() })
    ),
  },
  handler: async (ctx, { source, skills }) => {
    // source is "owner/repo" format
    const [owner, repo] = source.split("/");
    const defaultBranch = await resolveDefaultBranch(owner, repo);

    const branches = [defaultBranch];
    if (!branches.includes("main")) branches.push("main");
    if (!branches.includes("master")) branches.push("master");

    const tree = await fetchRepoTree(owner, repo, branches);
    const resolvedBranch = tree?.branch ?? defaultBranch;

    // Fallback: if tree fetch failed or repo too large, try direct path guessing per skill
    if (!tree) {
      console.log(`Could not fetch tree for ${source} — trying direct path guessing`);
      const matchedSkillIds = new Set<string>();
      for (const s of skills) {
        // Try common SKILL.md path patterns
        const paths = [
          `skills/${s.skillId}/SKILL.md`,
          `.claude/skills/${s.skillId}/SKILL.md`,
          `SKILL.md`,
        ];
        for (const path of paths) {
          const rawUrl = `https://raw.githubusercontent.com/${source}/${resolvedBranch}/${path}`;
          try {
            const res = await fetch(rawUrl, { method: "HEAD" });
            if (res.ok) {
              await ctx.runMutation(internal.skills.updateSkillMdUrl, {
                docId: s.docId as ReturnType<typeof v.id<"skills">>["type"],
                skillMdUrl: rawUrl,
              });
              matchedSkillIds.add(s.skillId);
              break;
            }
          } catch {
            continue;
          }
        }
      }
      // Mark remaining as not found
      const unmatched = skills.filter((s) => !matchedSkillIds.has(s.skillId));
      for (const s of unmatched) {
        await ctx.runMutation(internal.skills.updateSkillMdUrl, {
          docId: s.docId as ReturnType<typeof v.id<"skills">>["type"],
          skillMdUrl: "",
        });
      }
      console.log(
        `${source} (fallback): ${matchedSkillIds.size} matched, ${unmatched.length} not found`
      );
      return;
    }

    // Collect all SKILL.md paths and build a directory-name lookup
    const allSkillMdPaths: string[] = [];
    const skillMdByDir = new Map<string, string>();
    for (const entry of tree.entries) {
      if (entry.type !== "blob") continue;
      const lowerPath = entry.path.toLowerCase();
      if (lowerPath !== "skill.md" && !lowerPath.endsWith("/skill.md")) continue;

      allSkillMdPaths.push(entry.path);
      const parts = entry.path.split("/");
      if (parts.length >= 2) {
        const parentDir = parts[parts.length - 2];
        skillMdByDir.set(parentDir, entry.path);
      }
    }

    // Pass 1: match by directory name === skillId
    const matchedSkillIds = new Set<string>();
    const matchedPaths = new Set<string>();

    for (const s of skills) {
      const path = skillMdByDir.get(s.skillId);
      if (path) {
        const rawUrl = `https://raw.githubusercontent.com/${source}/${resolvedBranch}/${path}`;
        await ctx.runMutation(internal.skills.updateSkillMdUrl, {
          docId: s.docId as ReturnType<typeof v.id<"skills">>["type"],
          skillMdUrl: rawUrl,
        });
        matchedSkillIds.add(s.skillId);
        matchedPaths.add(path);
      }
    }

    // Pass 2: for unmatched skills, fetch unmatched SKILL.md files and check
    // the frontmatter `name` field (directory name often differs from skillId,
    // or SKILL.md may be at the repo root)
    const unmatchedSkills = skills.filter((s) => !matchedSkillIds.has(s.skillId));
    const unmatchedMdPaths = allSkillMdPaths
      .filter((path) => !matchedPaths.has(path))
      .map((path) => [path, path] as const);

    if (unmatchedSkills.length > 0 && unmatchedMdPaths.length > 0) {
      // Build a quick lookup by skillId for remaining skills
      const remaining = new Map(unmatchedSkills.map((s) => [s.skillId, s]));

      for (const [, mdPath] of unmatchedMdPaths) {
        if (remaining.size === 0) break;

        const rawUrl = `https://raw.githubusercontent.com/${source}/${resolvedBranch}/${mdPath}`;
        try {
          const res = await fetch(rawUrl);
          if (!res.ok) continue;
          const text = await res.text();
          // Extract name from frontmatter: "name: some-skill-id"
          const nameMatch = text.match(/^name:\s*(.+)$/m);
          if (!nameMatch) continue;
          const name = nameMatch[1].trim();

          // Try exact match, then kebab-case, then prefix match
          // (skills.sh sometimes truncates names at commas to create skillIds)
          const kebabName = name.toLowerCase().replace(/\s+/g, "-");
          let skill = remaining.get(name) ?? remaining.get(kebabName);
          if (!skill) {
            for (const [skillId, s] of remaining) {
              if (kebabName.startsWith(skillId)) {
                skill = s;
                break;
              }
            }
          }
          if (skill) {
            await ctx.runMutation(internal.skills.updateSkillMdUrl, {
              docId: skill.docId as ReturnType<typeof v.id<"skills">>["type"],
              skillMdUrl: rawUrl,
            });
            matchedSkillIds.add(skill.skillId);
            remaining.delete(skill.skillId);
          }
        } catch {
          continue;
        }
      }
    }

    // Mark remaining unmatched skills as not found
    const finalUnmatched = skills.filter((s) => !matchedSkillIds.has(s.skillId));
    for (const s of finalUnmatched) {
      await ctx.runMutation(internal.skills.updateSkillMdUrl, {
        docId: s.docId as ReturnType<typeof v.id<"skills">>["type"],
        skillMdUrl: "",
      });
    }

    console.log(
      `${source}: ${matchedSkillIds.size} matched, ${finalUnmatched.length} not found` +
        (tree.truncated ? " (tree truncated)" : "")
    );
  },
});

export const updateSkillMdUrl = internalMutation({
  args: {
    docId: v.id("skills"),
    skillMdUrl: v.string(),
  },
  handler: async (ctx, { docId, skillMdUrl }) => {
    await ctx.db.patch(docId, { skillMdUrl });
  },
});

export const backfillDiscoverUrls = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const REPOS_PER_BATCH = 25;
    const hasToken = !!process.env.GITHUB_TOKEN;
    const stagger = hasToken ? 500 : 30_000;

    const result = await ctx.runQuery(
      internal.skills.listSourcesNeedingDiscovery,
      { cursor: cursor ?? undefined }
    );

    const batch = result.sources.slice(0, REPOS_PER_BATCH);
    if (batch.length > 0) {
      console.log(`Scheduling Tree API discovery for ${batch.length} repos`);
      for (let i = 0; i < batch.length; i++) {
        await ctx.scheduler.runAfter(
          i * stagger,
          internal.skills.discoverSkillMdUrls,
          { source: batch[i].source, skills: batch[i].skills }
        );
      }
    }

    // More sources on this page that we didn't process
    const remaining = result.sources.length - batch.length;

    if (remaining > 0 || !result.isDone) {
      // If we have remaining on this page, re-query same cursor
      // Otherwise advance to next page
      const nextCursor =
        remaining > 0 ? (cursor ?? undefined) : result.nextCursor;
      const delay = batch.length * stagger + 5_000;
      await ctx.scheduler.runAfter(
        delay,
        internal.skills.backfillDiscoverUrls,
        { cursor: nextCursor }
      );
    } else {
      console.log("URL discovery complete — starting content fetch");
      await ctx.scheduler.runAfter(
        batch.length * stagger + 10_000,
        internal.skills.backfillFetchContent,
        {}
      );
    }
  },
});

// ---------------------------------------------------------------------------
// Phase 2 — Content Fetching (raw.githubusercontent.com)
// ---------------------------------------------------------------------------

export const listSkillsNeedingContentFetch = internalQuery({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const paginationOpts = cursor
      ? { numItems: 200, cursor }
      : { numItems: 200, cursor: null };
    const result = await ctx.db.query("skills").paginate(paginationOpts);

    const ids = result.page
      .filter(
        (s) =>
          s.skillMdUrl &&
          s.skillMdUrl !== "" &&
          (!s.content || s.description === "|" || s.description === ">")
      )
      .map((s) => s._id);

    return {
      ids,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const fetchSkillContent = internalAction({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    const skill = await ctx.runQuery(internal.skills.getById, { skillId });
    if (!skill || !skill.skillMdUrl) return;

    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(skill.skillMdUrl);
        if (!res.ok) {
          console.error(`Failed to fetch content for ${skill.skillId}: ${res.status}`);
          return;
        }

        const raw = await res.text();
        const description = extractFrontmatterDescription(raw);
        const body = extractBodyContent(raw);

        if (description || body) {
          await ctx.runMutation(internal.skills.updateDescription, {
            skillId,
            description: description ?? undefined,
            content: body ?? undefined,
            skillMdUrl: skill.skillMdUrl,
          });
        }
        return;
      } catch (e) {
        if (attempt < MAX_RETRIES - 1) {
          console.warn(`Retry ${attempt + 1}/${MAX_RETRIES} for ${skill.skillId}: ${e}`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        } else {
          console.error(`Error fetching content for ${skill.skillId} after ${MAX_RETRIES} attempts:`, e);
        }
      }
    }
  },
});

export const backfillFetchContent = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const STAGGER_MS = 500;

    const result = await ctx.runQuery(
      internal.skills.listSkillsNeedingContentFetch,
      { cursor: cursor ?? undefined }
    );

    if (result.ids.length > 0) {
      console.log(`Scheduling content fetch for ${result.ids.length} skills`);
      for (let i = 0; i < result.ids.length; i++) {
        await ctx.scheduler.runAfter(
          i * STAGGER_MS,
          internal.skills.fetchSkillContent,
          { skillId: result.ids[i] }
        );
      }
    }

    if (!result.isDone) {
      const delay = result.ids.length * STAGGER_MS + 5_000;
      await ctx.scheduler.runAfter(
        delay,
        internal.skills.backfillFetchContent,
        { cursor: result.nextCursor }
      );
    } else {
      console.log("Content backfill complete");
    }
  },
});

export const updateDescription = internalMutation({
  args: {
    skillId: v.id("skills"),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    skillMdUrl: v.string(),
  },
  handler: async (ctx, { skillId, description, content, skillMdUrl }) => {
    await ctx.db.patch(skillId, {
      ...(description !== undefined && { description }),
      ...(content !== undefined && { content }),
      skillMdUrl,
    });
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getById = internalQuery({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    return await ctx.db.get(skillId);
  },
});

export const getBySourceAndSkillId = query({
  args: { source: v.string(), skillId: v.string() },
  handler: async (ctx, { source, skillId }) => {
    return await ctx.db
      .query("skills")
      .withIndex("by_source_skillId", (q) =>
        q.eq("source", source).eq("skillId", skillId)
      )
      .unique();
  },
});

export const listByTechnologies = query({
  args: {
    technologies: v.array(v.string()),
    techLimits: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, { technologies, techLimits = {} }) => {
    const DEFAULT_LIMIT = 20;
    if (technologies.length === 0) return { groups: [] };

    type SkillDoc = NonNullable<
      Awaited<ReturnType<typeof ctx.db.get<"skills">>>
    >;
    const cache = new Map<string, SkillDoc>();
    const seen = new Set<string>(); // global dedup across technologies
    const groups: Array<{
      technology: string;
      skills: SkillDoc[];
      hasMore: boolean;
    }> = [];

    for (const tech of technologies) {
      const limit = techLimits[tech] ?? DEFAULT_LIMIT;
      // Over-fetch to compensate for cross-tech dedup (typically 10-30% overlap)
      const fetchCount = limit * 2 + 1;
      const entries = await ctx.db
        .query("skillTechnologies")
        .withIndex("by_technology", (q) => q.eq("technology", tech))
        .order("desc")
        .take(fetchCount);

      const skills: SkillDoc[] = [];

      for (const entry of entries) {
        if (skills.length >= limit) break;
        const id = entry.skillId.toString();
        if (seen.has(id)) continue;

        let skill = cache.get(id);
        if (!skill) {
          const doc = await ctx.db.get(entry.skillId);
          if (!doc) continue;
          skill = doc;
          cache.set(id, skill);
        }
        seen.add(id);
        skills.push(skill);
      }

      // More exist if we filled our limit AND the junction table may have more entries
      const hasMore = skills.length >= limit && entries.length === fetchCount;

      groups.push({
        technology: tech,
        skills: skills.sort((a, b) => b.installs - a.installs),
        hasMore,
      });
    }

    return { groups };
  },
});

export const list = query({
  args: {
    leaderboard: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { leaderboard, limit = 50 }) => {
    const skills = leaderboard
      ? await ctx.db
          .query("skills")
          .withIndex("by_leaderboard", (idx) =>
            idx.eq("leaderboard", leaderboard)
          )
          .take(limit)
      : await ctx.db.query("skills").take(limit);

    return skills.sort((a, b) => b.installs - a.installs);
  },
});

// ---------------------------------------------------------------------------
// Public content query
// ---------------------------------------------------------------------------

export const getContent = query({
  args: { source: v.string(), skillId: v.string() },
  handler: async (ctx, { source, skillId }) => {
    const skill = await ctx.db
      .query("skills")
      .withIndex("by_source_skillId", (q) =>
        q.eq("source", source).eq("skillId", skillId)
      )
      .unique();
    return skill?.content ?? null;
  },
});
