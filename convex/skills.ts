import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  resolveDefaultBranch,
  fetchRepoTree,
  NOT_MODIFIED,
} from "./lib/github";
import {
  buildTechKeywords,
  buildContentKeywords,
} from "./lib/technologyRegistry";

// ---------------------------------------------------------------------------
// Technology tagging
// ---------------------------------------------------------------------------

// Source org → technology, ONLY for orgs that exclusively produce skills for one tech
const SOURCE_TECH_MAP: Record<string, string> = {
  supabase: "supabase",
  "convex-dev": "convex",
  prisma: "prisma",
  firebase: "firebase",
};

// Keywords that must ALWAYS use word-boundary regex regardless of length,
// because they commonly appear as substrings in unrelated words.
const STRICT_BOUNDARY_KEYWORDS = new Set([
  "test",
  "ai",
  "go",
  "ci",
  "cd",
  "git",
  "css",
  "rest",
  "node",
  "java",
  "ruby",
  "php",
  "dart",
  "swift",
  "rust",
  "less",
]);

// Tier 1: Matches against name/skillId (derived from registry)
// NOTE: `source` is checked separately via SOURCE_TECH_MAP — not here
const TECH_KEYWORDS: Record<string, string[]> = buildTechKeywords();

// Tier 2: Matches against content/description (derived from registry)
const CONTENT_KEYWORDS: Record<string, string[]> = buildContentKeywords();

/** Word-boundary-aware match for short or ambiguous keywords to avoid false positives. */
function matchesKeyword(text: string, keyword: string): boolean {
  if (keyword.length <= 3 || STRICT_BOUNDARY_KEYWORDS.has(keyword)) {
    return new RegExp(`\\b${keyword}\\b`, "i").test(text);
  }
  return text.includes(keyword);
}

// ---------------------------------------------------------------------------
// Weighted tagging
// ---------------------------------------------------------------------------

interface TagResult {
  tech: string;
  weight: number;
}

function tagSkill(
  source: string,
  skillId: string,
  name: string,
  description?: string,
  content?: string,
): TagResult[] {
  const tagWeights = new Map<string, number>();

  function setMax(tech: string, weight: number) {
    tagWeights.set(tech, Math.max(tagWeights.get(tech) ?? 0, weight));
  }

  // Match against skillId + name only (NOT source — avoids false positives
  // like every vercel-labs skill being tagged as nextjs)
  const identityText = `${skillId} ${name}`.toLowerCase();
  const contentText = `${description ?? ""} ${content ?? ""}`.toLowerCase();

  // Source org check — only for orgs that exclusively produce one-tech skills
  const orgName = source.split("/")[0];
  const sourceTech = SOURCE_TECH_MAP[orgName];
  if (sourceTech) {
    setMax(sourceTech, 0.8);
  }

  for (const [tech, keywords] of Object.entries(TECH_KEYWORDS)) {
    // Tier 1: skillId/name — single keyword match → weight 0.9
    if (keywords.some((kw) => matchesKeyword(identityText, kw))) {
      setMax(tech, 0.9);
      continue;
    }
    // Tier 2: content/description — require specific phrases → weight 0.3-0.7
    const contentKws = CONTENT_KEYWORDS[tech];
    if (contentKws && contentText) {
      const matchCount = contentKws.filter((kw) =>
        contentText.includes(kw),
      ).length;
      if (matchCount >= 2) {
        const weight = Math.min(0.3 + (matchCount - 1) * 0.1, 0.7);
        setMax(tech, weight);
      }
    }
  }

  return Array.from(tagWeights.entries()).map(([tech, weight]) => ({
    tech,
    weight,
  }));
}

/** Extract flat technology ID array from weighted tag results. */
function tagResultsToIds(results: TagResult[]): string[] {
  return results.map((r) => r.tech);
}

// ---------------------------------------------------------------------------
// Sync actions
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;
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

    // Mark skills not seen in the API for 30+ days as delisted
    await ctx.scheduler.runAfter(5_000, internal.skills.markDelistedSkills, {});

    // Mark skills with stale content or empty URLs for re-fetch/re-discovery
    await ctx.scheduler.runAfter(8_000, internal.skills.markStaleContent, {});

    // Schedule two-phase content backfill (URL discovery → content fetch)
    await ctx.scheduler.runAfter(
      15_000,
      internal.skills.backfillDiscoverUrls,
      {},
    );

    // Recalculate dev dashboard stats after sync settles
    await ctx.scheduler.runAfter(
      20_000,
      internal.devStats.recalculateStats,
      {},
    );
  },
});

/** Sync the skillTechnologies junction table for a skill.
 *  Skips the delete+insert cycle when tags and installs are unchanged
 *  to avoid unnecessary database bandwidth consumption.
 */
async function syncSkillTechnologies(
  ctx: MutationCtx,
  skillDocId: Id<"skills">,
  tagResults: TagResult[],
  installs: number,
  forceRewrite = false,
) {
  const existingEntries = await ctx.db
    .query("skillTechnologies")
    .withIndex("by_skillId", (q) => q.eq("skillId", skillDocId))
    .collect();

  if (!forceRewrite) {
    const existingTechs = existingEntries.map((e) => e.technology).sort();
    const newTechs = tagResults.map((r) => r.tech).sort();
    const techsMatch =
      existingTechs.length === newTechs.length &&
      existingTechs.every((t, i) => t === newTechs[i]);
    const weightsMatch =
      existingEntries.length > 0 &&
      existingEntries.every((e) => {
        const tr = tagResults.find((r) => r.tech === e.technology);
        return tr !== undefined && e.weight === tr.weight;
      });

    if (techsMatch && weightsMatch) {
      // Techs and weights unchanged — patch installs in-place if needed
      const installsMatch =
        existingEntries.length === 0 ||
        existingEntries[0].installs === installs;
      if (installsMatch) return; // Nothing changed at all

      for (const entry of existingEntries) {
        await ctx.db.patch(entry._id, { installs });
      }
      return;
    }
  }

  // Full rewrite: techs or weights changed
  for (const entry of existingEntries) {
    await ctx.db.delete(entry._id);
  }
  for (const { tech, weight } of tagResults) {
    await ctx.db.insert("skillTechnologies", {
      skillId: skillDocId,
      technology: tech,
      installs,
      weight,
    });
  }
}

async function upsertSkillSummary(
  ctx: MutationCtx,
  fields: {
    source: string;
    skillId: string;
    name: string;
    description?: string;
    installs: number;
    technologies: string[];
    syncHash?: string;
    lastSeenInApi?: number;
    isDelisted?: boolean;
    skillDocId?: Id<"skills">;
    contentFetchedAt?: number;
    skillMdUrl?: string;
    needsContentFetch?: boolean;
    needsDiscovery?: boolean;
    hasContentFetchError?: boolean;
    hasSkillMdUrl?: boolean;
    discoveryFailCount?: number;
  },
) {
  const existing = await ctx.db
    .query("skillSummaries")
    .withIndex("by_source_skillId", (q) =>
      q.eq("source", fields.source).eq("skillId", fields.skillId),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      name: fields.name,
      description: fields.description,
      installs: fields.installs,
      technologies: fields.technologies,
      ...(fields.syncHash !== undefined && { syncHash: fields.syncHash }),
      ...(fields.lastSeenInApi !== undefined && {
        lastSeenInApi: fields.lastSeenInApi,
      }),
      ...(fields.isDelisted !== undefined && { isDelisted: fields.isDelisted }),
      ...(fields.skillDocId !== undefined && { skillDocId: fields.skillDocId }),
      ...(fields.contentFetchedAt !== undefined && {
        contentFetchedAt: fields.contentFetchedAt,
      }),
      ...(fields.skillMdUrl !== undefined && {
        skillMdUrl: fields.skillMdUrl,
      }),
      ...(fields.needsContentFetch !== undefined && {
        needsContentFetch: fields.needsContentFetch,
      }),
      ...(fields.needsDiscovery !== undefined && {
        needsDiscovery: fields.needsDiscovery,
      }),
      ...(fields.hasContentFetchError !== undefined && {
        hasContentFetchError: fields.hasContentFetchError,
      }),
      ...(fields.discoveryFailCount !== undefined && {
        discoveryFailCount: fields.discoveryFailCount,
      }),
      ...(fields.hasSkillMdUrl !== undefined && {
        hasSkillMdUrl: fields.hasSkillMdUrl,
      }),
    });
  } else {
    await ctx.db.insert("skillSummaries", {
      source: fields.source,
      skillId: fields.skillId,
      name: fields.name,
      description: fields.description,
      installs: fields.installs,
      technologies: fields.technologies,
      syncHash: fields.syncHash,
      lastSeenInApi: fields.lastSeenInApi,
      skillDocId: fields.skillDocId,
      contentFetchedAt: fields.contentFetchedAt,
      skillMdUrl: fields.skillMdUrl,
      needsContentFetch: fields.needsContentFetch,
      needsDiscovery: fields.needsDiscovery,
      hasContentFetchError: fields.hasContentFetchError,
      hasSkillMdUrl: fields.hasSkillMdUrl,
      discoveryFailCount: fields.discoveryFailCount,
    });
  }
}

/** Simple hash of the fields that come from the API to detect structural changes.
 *  Excludes `installs` — install count changes are handled via a lightweight
 *  patch path to avoid expensive full-doc reads and junction table rewrites.
 */
function computeSyncHash(name: string, leaderboard: string) {
  return `${name}|${leaderboard}`;
}

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
      const newHash = computeSyncHash(skill.name, leaderboard);

      // Phase 1: Lightweight check via summary (~200 bytes vs ~30KB full doc)
      const summary = await ctx.db
        .query("skillSummaries")
        .withIndex("by_source_skillId", (q) =>
          q.eq("source", skill.source).eq("skillId", skill.skillId),
        )
        .unique();

      // Hash unchanged — handle with lightweight patches, skip full skill doc read
      if (summary && summary.syncHash === newHash) {
        // Relist if skill reappears (rare — requires full doc read)
        if (summary.isDelisted) {
          const existing = await ctx.db
            .query("skills")
            .withIndex("by_source_skillId", (q) =>
              q.eq("source", skill.source).eq("skillId", skill.skillId),
            )
            .unique();
          if (existing) {
            await ctx.db.patch(existing._id, { isDelisted: false });
            const relistTagResults = tagSkill(
              skill.source,
              skill.skillId,
              skill.name,
              existing.description,
              existing.content,
            );
            const relistTechs = tagResultsToIds(relistTagResults);
            await syncSkillTechnologies(
              ctx,
              existing._id,
              relistTagResults,
              skill.installs,
              true,
            );
            await ctx.db.patch(summary._id, {
              lastSeenInApi: now,
              isDelisted: false,
              technologies: relistTechs,
              installs: skill.installs,
            });
          }
        } else if (summary.installs !== skill.installs) {
          // Installs changed but nothing structural — lightweight patch
          // Patch skill doc by ID (no full doc read needed)
          if (summary.skillDocId) {
            await ctx.db.patch(summary.skillDocId, {
              installs: skill.installs,
              lastSeenInApi: now,
              // Reset discovery counter — active installs mean repo is worth re-checking
              discoveryFailCount: 0,
            });
            // Patch junction table installs in-place (no delete+reinsert)
            const junctionEntries = await ctx.db
              .query("skillTechnologies")
              .withIndex("by_skillId", (q) =>
                q.eq("skillId", summary.skillDocId!),
              )
              .collect();
            for (const entry of junctionEntries) {
              if (entry.installs !== skill.installs) {
                await ctx.db.patch(entry._id, { installs: skill.installs });
              }
            }
          }
          await ctx.db.patch(summary._id, {
            lastSeenInApi: now,
            installs: skill.installs,
            discoveryFailCount: 0,
          });
        } else {
          await ctx.db.patch(summary._id, { lastSeenInApi: now });
        }
        continue;
      }

      // Phase 2: Hash changed or new skill — read full doc
      const existing = await ctx.db
        .query("skills")
        .withIndex("by_source_skillId", (q) =>
          q.eq("source", skill.source).eq("skillId", skill.skillId),
        )
        .unique();

      const tagResults = tagSkill(
        skill.source,
        skill.skillId,
        skill.name,
        existing?.description,
        existing?.content,
      );
      const technologies = tagResultsToIds(tagResults);

      let skillDocId;
      const tagsChanged = existing
        ? JSON.stringify(existing.technologies.slice().sort()) !==
          JSON.stringify(technologies.slice().sort())
        : false;

      if (existing) {
        skillDocId = existing._id;

        await ctx.db.patch(existing._id, {
          installs: skill.installs,
          leaderboard,
          ...(tagsChanged && { technologies }),
          lastSynced: now,
          syncHash: newHash,
          lastSeenInApi: now,
          ...(existing.isDelisted && { isDelisted: false }),
        });

        // Sync junction table — let skip-if-unchanged logic work
        // (only force rewrite for relist scenarios above)
        if (
          tagsChanged ||
          existing.installs !== skill.installs ||
          existing.isDelisted
        ) {
          await syncSkillTechnologies(
            ctx,
            skillDocId,
            tagResults,
            skill.installs,
          );
        }
      } else {
        skillDocId = await ctx.db.insert("skills", {
          source: skill.source,
          skillId: skill.skillId,
          name: skill.name,
          installs: skill.installs,
          technologies,
          leaderboard,
          lastSynced: now,
          syncHash: newHash,
          needsDiscovery: true,
          needsContentFetch: false,
          lastSeenInApi: now,
        });

        await syncSkillTechnologies(
          ctx,
          skillDocId,
          tagResults,
          skill.installs,
        );
      }

      // Update summary with new hash and data (include skillDocId + denormalized fields)
      await upsertSkillSummary(ctx, {
        source: skill.source,
        skillId: skill.skillId,
        name: skill.name,
        description: existing?.description,
        installs: skill.installs,
        technologies,
        syncHash: newHash,
        lastSeenInApi: now,
        skillDocId,
        ...(existing && {
          contentFetchedAt: existing.contentFetchedAt,
          skillMdUrl: existing.skillMdUrl,
          needsContentFetch: existing.needsContentFetch,
          needsDiscovery: existing.needsDiscovery,
        }),
        ...(!existing && {
          needsDiscovery: true,
          needsContentFetch: false,
        }),
        ...(existing?.isDelisted && { isDelisted: false }),
      });
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
  const descMatch = frontmatter.match(
    /^description:\s*["']?([^\s|>].*?)["']?\s*$/m,
  );
  if (descMatch) return descMatch[1].trim();

  // Fallback: try multi-line description (YAML block scalar with > or |)
  const multiLineMatch = frontmatter.match(
    /^description:\s*[|>]-?\s*\n((?:[ \t]+.*(?:\n|$))*)/m,
  );
  if (multiLineMatch) {
    const result = multiLineMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
    if (result) return result;
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
    // Scan summaries (~200 bytes) instead of skills (~30KB) to reduce bandwidth
    const result = await ctx.db
      .query("skillSummaries")
      .withIndex("by_needsDiscovery", (q) => q.eq("needsDiscovery", true))
      .paginate(paginationOpts);

    // Group skills by source repo
    const bySource = new Map<
      string,
      Array<{ docId: string; skillId: string }>
    >();
    for (const s of result.page) {
      if (!s.skillDocId) continue;
      const list = bySource.get(s.source) ?? [];
      list.push({ docId: s.skillDocId, skillId: s.skillId });
      bySource.set(s.source, list);
    }

    const sources = Array.from(bySource.entries()).map(([source, skills]) => ({
      source,
      skills,
    }));

    return {
      sources,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/** Check if a source looks like a GitHub org/repo (e.g. "resend/resend-skills")
 *  vs a domain (e.g. "smithery.ai", "bun.sh", "react-aria.adobe.com") */
function isGitHubSource(source: string): boolean {
  const parts = source.split("/");
  // Must be "owner/repo" format. Dots in repo name are fine (e.g. vercel/next.js)
  // but dots in the org name indicate a domain (e.g. smithery.ai → not GitHub)
  return parts.length === 2 && !parts[0].includes(".");
}

export const discoverSkillMdUrls = internalAction({
  args: {
    source: v.string(),
    skills: v.array(v.object({ docId: v.string(), skillId: v.string() })),
  },
  handler: async (ctx, { source, skills }) => {
    // Skip non-GitHub sources (domains like smithery.ai, bun.sh, etc.)
    if (!isGitHubSource(source)) {
      for (const s of skills) {
        await ctx.runMutation(internal.skills.updateSkillMdUrl, {
          docId: s.docId as ReturnType<typeof v.id<"skills">>["type"],
          skillMdUrl: "",
        });
      }
      return;
    }

    // source is "owner/repo" format
    const [owner, repo] = source.split("/");
    const defaultBranch = await resolveDefaultBranch(owner, repo);

    const branches = [defaultBranch];
    if (!branches.includes("main")) branches.push("main");
    if (!branches.includes("master")) branches.push("master");

    const treeResult = await fetchRepoTree(owner, repo, branches);
    // Skills sync never passes an etag so NOT_MODIFIED can't occur,
    // but TypeScript requires handling it. Treat as a miss.
    const tree = treeResult === NOT_MODIFIED ? null : treeResult;
    const resolvedBranch = tree?.branch ?? defaultBranch;

    // Fallback: if tree fetch failed or repo too large, try direct path guessing per skill
    if (!tree) {
      console.log(
        `Could not fetch tree for ${source} — trying direct path guessing`,
      );
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
        `${source} (fallback): ${matchedSkillIds.size} matched, ${unmatched.length} not found`,
      );
      return;
    }

    // Collect all SKILL.md paths and build a directory-name lookup
    const allSkillMdPaths: string[] = [];
    const skillMdByDir = new Map<string, string>();
    for (const entry of tree.entries) {
      if (entry.type !== "blob") continue;
      const lowerPath = entry.path.toLowerCase();
      if (lowerPath !== "skill.md" && !lowerPath.endsWith("/skill.md"))
        continue;

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
    const unmatchedSkills = skills.filter(
      (s) => !matchedSkillIds.has(s.skillId),
    );
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
          const name = nameMatch[1].trim().replace(/^["']|["']$/g, "");

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
    const finalUnmatched = skills.filter(
      (s) => !matchedSkillIds.has(s.skillId),
    );
    for (const s of finalUnmatched) {
      await ctx.runMutation(internal.skills.updateSkillMdUrl, {
        docId: s.docId as ReturnType<typeof v.id<"skills">>["type"],
        skillMdUrl: "",
      });
    }

    console.log(
      `${source}: ${matchedSkillIds.size} matched, ${finalUnmatched.length} not found` +
        (tree.truncated ? " (tree truncated)" : ""),
    );
  },
});

export const updateSkillMdUrl = internalMutation({
  args: {
    docId: v.id("skills"),
    skillMdUrl: v.string(),
  },
  handler: async (ctx, { docId, skillMdUrl }) => {
    const hasUrl = skillMdUrl !== "";
    const now = Date.now();
    const skill = await ctx.db.get(docId);
    const newFailCount = hasUrl
      ? 0
      : ((skill?.discoveryFailCount ?? 0) + 1);
    await ctx.db.patch(docId, {
      skillMdUrl,
      needsDiscovery: false,
      needsContentFetch: hasUrl,
      discoveryFailCount: newFailCount,
      ...(hasUrl && { hasContentFetchError: false }),
      ...(!hasUrl && { contentFetchedAt: now }),
    });
    // Sync summary
    if (skill) {
      const summary = await ctx.db
        .query("skillSummaries")
        .withIndex("by_source_skillId", (q) =>
          q.eq("source", skill.source).eq("skillId", skill.skillId),
        )
        .unique();
      if (summary) {
        await ctx.db.patch(summary._id, {
          skillMdUrl,
          hasSkillMdUrl: hasUrl,
          needsDiscovery: false,
          needsContentFetch: hasUrl,
          discoveryFailCount: newFailCount,
          ...(!hasUrl && { contentFetchedAt: now }),
        });
      }
    }
  },
});

export const backfillDiscoverUrls = internalAction({
  args: {
    cursor: v.optional(v.string()),
    scheduledSources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { cursor, scheduledSources }) => {
    const REPOS_PER_BATCH = 25;
    const hasToken = !!process.env.GITHUB_TOKEN;
    const stagger = hasToken ? 500 : 30_000;
    const alreadyScheduled = new Set(scheduledSources ?? []);

    const result = await ctx.runQuery(
      internal.skills.listSourcesNeedingDiscovery,
      { cursor: cursor ?? undefined },
    );

    // Filter out sources already scheduled in previous batches
    const newSources = result.sources.filter(
      (s) => !alreadyScheduled.has(s.source),
    );
    const batch = newSources.slice(0, REPOS_PER_BATCH);
    if (batch.length > 0) {
      console.log(`Scheduling Tree API discovery for ${batch.length} repos`);
      for (let i = 0; i < batch.length; i++) {
        await ctx.scheduler.runAfter(
          i * stagger,
          internal.skills.discoverSkillMdUrls,
          { source: batch[i].source, skills: batch[i].skills },
        );
        alreadyScheduled.add(batch[i].source);
      }
    }

    // More sources on this page that we didn't process
    const remaining = newSources.length - batch.length;

    if (remaining > 0 || !result.isDone) {
      // If we have remaining on this page, re-query same cursor
      // Otherwise advance to next page
      const nextCursor =
        remaining > 0 ? (cursor ?? undefined) : result.nextCursor;
      const delay = batch.length * stagger + 5_000;
      await ctx.scheduler.runAfter(
        delay,
        internal.skills.backfillDiscoverUrls,
        { cursor: nextCursor, scheduledSources: [...alreadyScheduled] },
      );
    } else {
      console.log("URL discovery complete — starting content fetch");
      await ctx.scheduler.runAfter(
        batch.length * stagger + 10_000,
        internal.skills.backfillFetchContent,
        {},
      );
    }
  },
});

// ---------------------------------------------------------------------------
// Phase 2 — Content Fetching (raw.githubusercontent.com)
// ---------------------------------------------------------------------------

const CONTENT_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REDISCOVERY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Mark skills whose content is stale (>7 days) or whose empty URL needs re-discovery (>7 days).
 *  Scans skillSummaries (~200 bytes each) instead of skills (~30KB each) to reduce bandwidth.
 */
export const markStaleContentBatch = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const paginationOpts = cursor
      ? { numItems: 200, cursor }
      : { numItems: 200, cursor: null };
    const result = await ctx.db
      .query("skillSummaries")
      .paginate(paginationOpts);

    const now = Date.now();
    let marked = 0;

    for (const s of result.page) {
      if (s.isDelisted) continue;
      if (!s.skillDocId) continue;

      // Content re-fetch: non-empty URL, >7 days since last fetch
      const contentStale =
        s.skillMdUrl &&
        s.skillMdUrl !== "" &&
        !s.needsContentFetch &&
        now - (s.contentFetchedAt ?? 0) > CONTENT_REFRESH_INTERVAL_MS;

      // URL re-discovery: empty URL, >7 days since last check, <3 failures
      const needsRediscovery =
        s.skillMdUrl === "" &&
        !s.needsDiscovery &&
        (s.discoveryFailCount ?? 0) < 3 &&
        now - (s.contentFetchedAt ?? 0) > REDISCOVERY_INTERVAL_MS;

      if (contentStale) {
        await ctx.db.patch(s.skillDocId, { needsContentFetch: true });
        await ctx.db.patch(s._id, { needsContentFetch: true });
        marked++;
      } else if (needsRediscovery) {
        await ctx.db.patch(s.skillDocId, { needsDiscovery: true });
        await ctx.db.patch(s._id, { needsDiscovery: true });
        marked++;
      }
    }

    return {
      nextCursor: result.continueCursor,
      isDone: result.isDone,
      marked,
    };
  },
});

export const markStaleContent = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | undefined;
    let isDone = false;
    let total = 0;

    while (!isDone) {
      const result: { nextCursor: string; isDone: boolean; marked: number } =
        await ctx.runMutation(internal.skills.markStaleContentBatch, {
          cursor,
        });
      total += result.marked;
      cursor = result.nextCursor;
      isDone = result.isDone;
    }

    if (total > 0) {
      console.log(
        `Marked ${total} skills for content re-fetch or URL re-discovery`,
      );
    }
  },
});

export const listSkillsNeedingContentFetch = internalQuery({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const paginationOpts = cursor
      ? { numItems: 200, cursor }
      : { numItems: 200, cursor: null };
    // Scan summaries (~200 bytes) instead of skills (~30KB) to reduce bandwidth
    const result = await ctx.db
      .query("skillSummaries")
      .withIndex("by_needsContentFetch", (q) =>
        q.eq("needsContentFetch", true),
      )
      .paginate(paginationOpts);

    // Filter to only skills that have a valid URL and a stored doc ID
    const skills = result.page
      .filter((s) => s.skillMdUrl && s.skillMdUrl !== "" && s.skillDocId)
      .map((s) => ({
        id: s.skillDocId!,
        skillMdUrl: s.skillMdUrl!,
        skillName: s.skillId,
      }));

    return {
      skills,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const fetchSkillContent = internalAction({
  args: {
    skillId: v.id("skills"),
    skillMdUrl: v.string(),
    skillName: v.optional(v.string()),
  },
  handler: async (ctx, { skillId, skillMdUrl, skillName }) => {
    const label = skillName ?? skillId;
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(skillMdUrl);
        if (!res.ok) {
          console.error(
            `Failed to fetch content for ${label}: ${res.status}`,
          );
          // Track failure — after 3 consecutive failures, re-discover the URL
          await ctx.runMutation(internal.skills.markContentFetchFailed, {
            skillId,
          });
          return;
        }

        const raw = await res.text();
        const description = extractFrontmatterDescription(raw);
        const body = extractBodyContent(raw);

        if (description !== null || body) {
          await ctx.runMutation(internal.skills.updateDescription, {
            skillId,
            description: description ?? undefined,
            content: body ?? undefined,
            skillMdUrl,
          });
        } else {
          // Content fetched but nothing parseable — still record the fetch time
          await ctx.runMutation(internal.skills.markContentFetched, {
            skillId,
          });
        }
        return;
      } catch (e) {
        if (attempt < MAX_RETRIES - 1) {
          console.warn(
            `Retry ${attempt + 1}/${MAX_RETRIES} for ${label}: ${e}`,
          );
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        } else {
          console.error(
            `Error fetching content for ${label} after ${MAX_RETRIES} attempts:`,
            e,
          );
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
      { cursor: cursor ?? undefined },
    );

    if (result.skills.length > 0) {
      console.log(
        `Scheduling content fetch for ${result.skills.length} skills`,
      );
      for (let i = 0; i < result.skills.length; i++) {
        await ctx.scheduler.runAfter(
          i * STAGGER_MS,
          internal.skills.fetchSkillContent,
          {
            skillId: result.skills[i].id,
            skillMdUrl: result.skills[i].skillMdUrl,
            skillName: result.skills[i].skillName,
          },
        );
      }
    }

    if (!result.isDone) {
      const delay = result.skills.length * STAGGER_MS + 5_000;
      await ctx.scheduler.runAfter(
        delay,
        internal.skills.backfillFetchContent,
        { cursor: result.nextCursor },
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
    const skill = await ctx.db.get(skillId);
    if (!skill) return;

    const now = Date.now();

    // Clear broken legacy descriptions ("|" or ">") when no valid description parsed
    const isBrokenDesc =
      skill.description === "|" || skill.description === ">";
    const effectiveDescription =
      description ?? (isBrokenDesc ? "" : undefined);

    const newDescription = effectiveDescription ?? skill.description;
    const newContent = content ?? skill.content;

    // Detect if content actually changed
    const descriptionChanged =
      effectiveDescription !== undefined &&
      effectiveDescription !== skill.description;
    const contentChanged = content !== undefined && content !== skill.content;
    const hasActualChange = descriptionChanged || contentChanged;

    // Re-tag with all available text (name + description + content)
    const tagResults = tagSkill(
      skill.source,
      skill.skillId,
      skill.name,
      newDescription,
      newContent,
    );
    const technologies = tagResultsToIds(tagResults);

    const tagsChanged =
      JSON.stringify(skill.technologies.slice().sort()) !==
      JSON.stringify(technologies.slice().sort());

    await ctx.db.patch(skillId, {
      ...(effectiveDescription !== undefined && {
        description: effectiveDescription,
      }),
      ...(content !== undefined && { content }),
      skillMdUrl,
      ...(tagsChanged && { technologies }),
      contentFetchedAt: now,
      ...(hasActualChange && { contentUpdatedAt: now }),
      needsContentFetch: false,
      contentFetchFailCount: 0,
      hasContentFetchError: false,
    });

    if (tagsChanged) {
      await syncSkillTechnologies(ctx, skillId, tagResults, skill.installs);
    }

    // Always sync summary with contentFetchedAt and needsContentFetch
    await upsertSkillSummary(ctx, {
      source: skill.source,
      skillId: skill.skillId,
      name: skill.name,
      description: newDescription,
      installs: skill.installs,
      technologies,
      skillDocId: skillId,
      contentFetchedAt: now,
      needsContentFetch: false,
      hasContentFetchError: false,
      skillMdUrl,
      hasSkillMdUrl: !!skillMdUrl && skillMdUrl !== "",
    });
  },
});

export const markContentFetched = internalMutation({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    const now = Date.now();
    const skill = await ctx.db.get(skillId);
    await ctx.db.patch(skillId, {
      contentFetchedAt: now,
      needsContentFetch: false,
    });
    // Sync summary (infrequent call, so reading skill doc is acceptable)
    if (skill) {
      const summary = await ctx.db
        .query("skillSummaries")
        .withIndex("by_source_skillId", (q) =>
          q.eq("source", skill.source).eq("skillId", skill.skillId),
        )
        .unique();
      if (summary) {
        await ctx.db.patch(summary._id, {
          contentFetchedAt: now,
          needsContentFetch: false,
        });
      }
    }
  },
});

export const markContentFetchFailed = internalMutation({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    const skill = await ctx.db.get(skillId);
    if (!skill) return;

    const now = Date.now();
    const failCount = (skill.contentFetchFailCount ?? 0) + 1;

    // Sync summary
    const summary = await ctx.db
      .query("skillSummaries")
      .withIndex("by_source_skillId", (q) =>
        q.eq("source", skill.source).eq("skillId", skill.skillId),
      )
      .unique();

    if (failCount >= 2) {
      // After 2 consecutive failures, clear the URL and re-discover
      await ctx.db.patch(skillId, {
        contentFetchedAt: now,
        needsContentFetch: false,
        contentFetchFailCount: 0,
        hasContentFetchError: true,
        skillMdUrl: "",
        needsDiscovery: true,
      });
      if (summary) {
        await ctx.db.patch(summary._id, {
          contentFetchedAt: now,
          needsContentFetch: false,
          hasContentFetchError: true,
          skillMdUrl: "",
          hasSkillMdUrl: false,
          needsDiscovery: true,
        });
      }
    } else {
      // First failure: show warning immediately
      await ctx.db.patch(skillId, {
        contentFetchedAt: now,
        needsContentFetch: false,
        contentFetchFailCount: failCount,
        hasContentFetchError: true,
      });
      if (summary) {
        await ctx.db.patch(summary._id, {
          contentFetchedAt: now,
          hasContentFetchError: true,
          needsContentFetch: false,
        });
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Delist skills not seen in the API for 30+ days
// ---------------------------------------------------------------------------

const DELIST_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const listStaleSummaries = internalQuery({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const paginationOpts = cursor
      ? { numItems: 100, cursor }
      : { numItems: 100, cursor: null };
    // Convex orders: undefined < false < true — lt(true) skips already-delisted summaries
    const result = await ctx.db
      .query("skillSummaries")
      .withIndex("by_isDelisted", (q) => q.lt("isDelisted", true))
      .paginate(paginationOpts);

    const cutoff = Date.now() - DELIST_THRESHOLD_MS;
    const staleEntries = result.page
      .filter((s) => s.lastSeenInApi !== undefined && s.lastSeenInApi < cutoff)
      .map((s) => ({ summaryId: s._id, source: s.source, skillId: s.skillId }));

    return {
      entries: staleEntries,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const delistSkillsBatch = internalMutation({
  args: {
    entries: v.array(
      v.object({
        summaryId: v.id("skillSummaries"),
        source: v.string(),
        skillId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { entries }) => {
    for (const { summaryId, source, skillId } of entries) {
      // Delete summary
      const summary = await ctx.db.get(summaryId);
      if (summary) {
        await ctx.db.delete(summaryId);
      }

      // Mark skill as delisted + clean up junction entries
      const skill = await ctx.db
        .query("skills")
        .withIndex("by_source_skillId", (q) =>
          q.eq("source", source).eq("skillId", skillId),
        )
        .unique();
      if (skill && !skill.isDelisted) {
        await ctx.db.patch(skill._id, { isDelisted: true });

        const techEntries = await ctx.db
          .query("skillTechnologies")
          .withIndex("by_skillId", (q) => q.eq("skillId", skill._id))
          .collect();
        for (const entry of techEntries) {
          await ctx.db.delete(entry._id);
        }
      }
    }
  },
});

export const markDelistedSkills = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | undefined;
    let isDone = false;
    let totalDelisted = 0;

    while (!isDone) {
      const result = await ctx.runQuery(internal.skills.listStaleSummaries, {
        cursor,
      });

      if (result.entries.length > 0) {
        await ctx.runMutation(internal.skills.delistSkillsBatch, {
          entries: result.entries,
        });
        totalDelisted += result.entries.length;
      }

      cursor = result.nextCursor;
      isDone = result.isDone;
    }

    if (totalDelisted > 0) {
      console.log(
        `Delisted ${totalDelisted} skills not seen in API for 30+ days`,
      );
    }
  },
});

// ---------------------------------------------------------------------------
// One-time re-tag backfill
// ---------------------------------------------------------------------------

export const retagBatch = internalMutation({
  args: {
    skillIds: v.array(v.id("skills")),
  },
  handler: async (ctx, { skillIds }) => {
    let updated = 0;
    for (const id of skillIds) {
      const skill = await ctx.db.get(id);
      if (!skill) continue;

      const tagResults = tagSkill(
        skill.source,
        skill.skillId,
        skill.name,
        skill.description,
        skill.content,
      );
      const newTags = tagResultsToIds(tagResults);

      const oldTags = skill.technologies.slice().sort();
      const sortedNew = newTags.slice().sort();
      if (JSON.stringify(oldTags) !== JSON.stringify(sortedNew)) {
        await ctx.db.patch(id, { technologies: newTags });
        await syncSkillTechnologies(ctx, id, tagResults, skill.installs);
        updated++;
      }
    }
    return updated;
  },
});

export const retagAllSkills = internalAction({
  args: {},
  handler: async (ctx) => {
    const BATCH_SIZE = 100;
    let cursor: string | undefined;
    let totalUpdated = 0;

    for (;;) {
      const result: {
        ids: string[];
        nextCursor: string | undefined;
        isDone: boolean;
      } = await ctx.runQuery(internal.skills.listSkillIdsForRetag, {
        cursor,
        limit: BATCH_SIZE,
      });

      if (result.ids.length > 0) {
        const updated = await ctx.runMutation(internal.skills.retagBatch, {
          skillIds: result.ids as Id<"skills">[],
        });
        totalUpdated += updated as number;
        console.log(
          `Retagged batch: ${updated} of ${result.ids.length} skills updated`,
        );
      }

      if (result.isDone) break;
      cursor = result.nextCursor;
    }

    console.log(`Retag complete: ${totalUpdated} skills updated`);
  },
});

export const listSkillIdsForRetag = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, { cursor, limit }) => {
    const query = ctx.db.query("skills");
    const results = await query
      .order("asc")
      .paginate({ numItems: limit, cursor: cursor ?? null });

    return {
      ids: results.page.map((s) => s._id),
      nextCursor: results.continueCursor,
      isDone: results.isDone,
    };
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
    type SkillSummary = Pick<
      SkillDoc,
      | "_id"
      | "_creationTime"
      | "source"
      | "skillId"
      | "name"
      | "description"
      | "installs"
      | "technologies"
    >;
    const cache = new Map<string, SkillSummary>();
    const groups: Array<{
      technology: string;
      skills: SkillSummary[];
      hasMore: boolean;
    }> = [];

    for (const tech of technologies) {
      const limit = techLimits[tech] ?? DEFAULT_LIMIT;
      const entries = await ctx.db
        .query("skillTechnologies")
        .withIndex("by_technology", (q) => q.eq("technology", tech))
        .order("desc")
        .take(limit + 1);

      const skills: SkillSummary[] = [];

      for (const entry of entries) {
        if (skills.length >= limit) break;
        const id = entry.skillId.toString();

        let skill = cache.get(id);
        if (!skill) {
          const doc = await ctx.db.get(entry.skillId);
          if (!doc) continue;
          skill = {
            _id: doc._id,
            _creationTime: doc._creationTime,
            source: doc.source,
            skillId: doc.skillId,
            name: doc.name,
            description: doc.description,
            installs: doc.installs,
            technologies: doc.technologies,
          };
          cache.set(id, skill);
        }
        skills.push(skill);
      }

      const hasMore = entries.length > limit;
      groups.push({
        technology: tech,
        skills,
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
    // Convex orders: undefined < false < true — lt(true) includes active + never-flagged skills
    const skills = leaderboard
      ? await ctx.db
          .query("skills")
          .withIndex("by_leaderboard_active", (q) =>
            q.eq("leaderboard", leaderboard).lt("isDelisted", true),
          )
          .take(limit)
      : await ctx.db
          .query("skills")
          .withIndex("by_isDelisted", (q) => q.lt("isDelisted", true))
          .take(limit);

    return skills.sort((a, b) => b.installs - a.installs);
  },
});

// ---------------------------------------------------------------------------
// Skill summaries (for client-side search)
// ---------------------------------------------------------------------------

export const listAllSkillSummaries = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    return ctx.db.query("skillSummaries").paginate(paginationOpts);
  },
});

export const backfillSkillSummaries = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | undefined;
    let isDone = false;
    let total = 0;

    while (!isDone) {
      const result: { nextCursor: string; isDone: boolean; count: number } =
        await ctx.runMutation(internal.skills.backfillSkillSummariesBatch, {
          cursor,
        });
      total += result.count;
      cursor = result.nextCursor;
      isDone = result.isDone;
    }

    console.log(`Backfilled ${total} skill summaries`);
  },
});

export const backfillSkillSummariesBatch = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const paginationOpts = cursor
      ? { numItems: 200, cursor }
      : { numItems: 200, cursor: null };
    const result = await ctx.db.query("skills").paginate(paginationOpts);

    for (const s of result.page) {
      await upsertSkillSummary(ctx, {
        source: s.source,
        skillId: s.skillId,
        name: s.name,
        description: s.description,
        installs: s.installs,
        technologies: s.technologies,
        syncHash: s.syncHash,
        lastSeenInApi: s.lastSeenInApi,
        isDelisted: s.isDelisted,
        skillDocId: s._id,
        contentFetchedAt: s.contentFetchedAt,
        skillMdUrl: s.skillMdUrl,
        needsContentFetch: s.needsContentFetch,
        needsDiscovery: s.needsDiscovery,
        hasContentFetchError: s.hasContentFetchError,
        discoveryFailCount: s.discoveryFailCount,
        hasSkillMdUrl: !!s.skillMdUrl && s.skillMdUrl !== "",
      });
    }

    return {
      nextCursor: result.continueCursor,
      isDone: result.isDone,
      count: result.page.length,
    };
  },
});

// ---------------------------------------------------------------------------
// Backfill: set needsDiscovery / needsContentFetch / syncHash on existing rows
// ---------------------------------------------------------------------------

export const backfillSyncFlags = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const paginationOpts = cursor
      ? { numItems: 200, cursor }
      : { numItems: 200, cursor: null };
    const result = await ctx.db.query("skills").paginate(paginationOpts);
    const now = Date.now();
    let patched = 0;

    for (const s of result.page) {
      const updates: Record<string, unknown> = {};

      // Set syncHash if missing
      if (s.syncHash === undefined) {
        updates.syncHash = computeSyncHash(s.name, s.leaderboard);
      }

      // Set needsDiscovery if missing
      if (s.needsDiscovery === undefined) {
        updates.needsDiscovery = !s.skillMdUrl || s.skillMdUrl === "";
      }

      // Set needsContentFetch if missing
      if (s.needsContentFetch === undefined) {
        const hasUrl = !!s.skillMdUrl && s.skillMdUrl !== "";
        const needsFetch =
          hasUrl &&
          (!s.content ||
            s.description === "|" ||
            s.description === ">" ||
            s.description === "" ||
            now - (s.contentFetchedAt ?? 0) > CONTENT_REFRESH_INTERVAL_MS);
        updates.needsContentFetch = needsFetch;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(s._id, updates);
        patched++;
      }
    }

    return {
      nextCursor: result.continueCursor,
      isDone: result.isDone,
      patched,
    };
  },
});

export const backfillAllSyncFlags = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | undefined;
    let isDone = false;
    let total = 0;

    while (!isDone) {
      const result: { nextCursor: string; isDone: boolean; patched: number } =
        await ctx.runMutation(internal.skills.backfillSyncFlags, { cursor });
      total += result.patched;
      cursor = result.nextCursor;
      isDone = result.isDone;
    }

    console.log(`Backfilled sync flags on ${total} skills`);
  },
});

export const backfillLastSeenInApiBatch = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const paginationOpts = cursor
      ? { numItems: 200, cursor }
      : { numItems: 200, cursor: null };
    const result = await ctx.db
      .query("skillSummaries")
      .paginate(paginationOpts);
    const now = Date.now();
    let patched = 0;

    for (const s of result.page) {
      if (s.lastSeenInApi === undefined) {
        await ctx.db.patch(s._id, { lastSeenInApi: now });
        patched++;
      }
    }

    return {
      nextCursor: result.continueCursor,
      isDone: result.isDone,
      patched,
    };
  },
});

export const backfillLastSeenInApi = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | undefined;
    let isDone = false;
    let total = 0;

    while (!isDone) {
      const result: { nextCursor: string; isDone: boolean; patched: number } =
        await ctx.runMutation(internal.skills.backfillLastSeenInApiBatch, {
          cursor,
        });
      total += result.patched;
      cursor = result.nextCursor;
      isDone = result.isDone;
    }

    console.log(`Backfilled lastSeenInApi on ${total} skills`);
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
        q.eq("source", source).eq("skillId", skillId),
      )
      .unique();
    return skill?.content ?? null;
  },
});
