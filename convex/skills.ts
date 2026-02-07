import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

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
const MIN_INSTALLS = 10;

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
      }),
    ),
    leaderboard: v.string(),
  },
  handler: async (ctx, { skills, leaderboard }) => {
    const now = Date.now();

    for (const skill of skills) {
      const existing = await ctx.db
        .query("skills")
        .withIndex("by_source_skillId", (q) =>
          q.eq("source", skill.source).eq("skillId", skill.skillId),
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
// Description fetching
// ---------------------------------------------------------------------------

const SKILL_MD_PATHS = [
  "skills/{skillId}/SKILL.md",
  "{skillId}/SKILL.md",
  ".claude/skills/{skillId}/SKILL.md",
  ".cursor/skills/{skillId}/SKILL.md",
];

export const fetchSkillDescription = internalAction({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    const skill = await ctx.runQuery(internal.skills.getById, { skillId });
    if (!skill) return;

    for (const pathTemplate of SKILL_MD_PATHS) {
      const path = pathTemplate.replace("{skillId}", skill.skillId);
      const url = `https://raw.githubusercontent.com/${skill.source}/main/${path}`;

      try {
        const res = await fetch(url);
        if (!res.ok) continue;

        const content = await res.text();
        const description = extractFrontmatterDescription(content);

        if (description) {
          await ctx.runMutation(internal.skills.updateDescription, {
            skillId,
            description,
            skillMdUrl: url,
          });
          return;
        }
      } catch {
        continue;
      }
    }
  },
});

function extractFrontmatterDescription(content: string): string | null {
  // YAML frontmatter is between --- markers
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = match[1];

  // Look for description field in YAML
  const descMatch = frontmatter.match(
    /^description:\s*["']?(.+?)["']?\s*$/m,
  );
  if (descMatch) return descMatch[1].trim();

  // Fallback: try multi-line description
  const multiLineMatch = frontmatter.match(
    /^description:\s*[|>]-?\s*\n([\s\S]*?)(?=\n\w|\n---|\n$)/m,
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

export const updateDescription = internalMutation({
  args: {
    skillId: v.id("skills"),
    description: v.string(),
    skillMdUrl: v.string(),
  },
  handler: async (ctx, { skillId, description, skillMdUrl }) => {
    await ctx.db.patch(skillId, { description, skillMdUrl });
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
        q.eq("source", source).eq("skillId", skillId),
      )
      .unique();
  },
});

export const listByTechnologies = query({
  args: { technologies: v.array(v.string()) },
  handler: async (ctx, { technologies }) => {
    if (technologies.length === 0) return [];

    // Query junction table per technology — indexed, reads only matching docs
    const seen = new Set<string>();
    const results = [];

    for (const tech of technologies) {
      const entries = await ctx.db
        .query("skillTechnologies")
        .withIndex("by_technology", (q) => q.eq("technology", tech))
        .order("desc")
        .take(50);

      for (const entry of entries) {
        const id = entry.skillId.toString();
        if (seen.has(id)) continue;
        seen.add(id);

        const skill = await ctx.db.get(entry.skillId);
        if (skill) {
          results.push(skill);
        }
      }
    }

    return results.sort((a, b) => b.installs - a.installs);
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
            idx.eq("leaderboard", leaderboard),
          )
          .take(limit)
      : await ctx.db.query("skills").take(limit);

    return skills.sort((a, b) => b.installs - a.installs);
  },
});
