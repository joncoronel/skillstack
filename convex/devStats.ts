import {
  action,
  internalAction,
  internalMutation,
  query,
} from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Admin guard — checks caller's email against ADMIN_EMAILS env var
// ---------------------------------------------------------------------------

async function assertAdmin(ctx: { auth: QueryCtx["auth"] }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) throw new Error("Not authenticated");
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (adminEmails.length === 0) throw new Error("ADMIN_EMAILS not configured");
  if (!adminEmails.includes(identity.email)) throw new Error("Not authorized");
}

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) return false;
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    return adminEmails.includes(identity.email);
  },
});

// ---------------------------------------------------------------------------
// Stats (reads a single cached document)
// ---------------------------------------------------------------------------

export const getSyncStats = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const stats = await ctx.db.query("syncStats").first();
    return (
      stats ?? {
        totalSkills: 0,
        contentFetchErrors: 0,
        pendingContentFetch: 0,
        pendingDiscovery: 0,
        noSkillMdUrl: 0,
        noUrlExhausted: 0,
        delisted: 0,
        recalculatedAt: 0,
      }
    );
  },
});

/** Recalculate all stats by scanning summaries. Called at end of sync pipeline. */
export const recalculateStatsBatch = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const paginationOpts = cursor
      ? { numItems: 500, cursor }
      : { numItems: 500, cursor: null };
    const result = await ctx.db
      .query("skillSummaries")
      .paginate(paginationOpts);

    let totalSkills = 0;
    let contentFetchErrors = 0;
    let pendingContentFetch = 0;
    let pendingDiscovery = 0;
    let noSkillMdUrl = 0;
    let noUrlExhausted = 0;
    let delisted = 0;

    for (const s of result.page) {
      totalSkills++;
      if (s.hasContentFetchError) contentFetchErrors++;
      if (s.needsContentFetch) pendingContentFetch++;
      if (s.needsDiscovery) pendingDiscovery++;
      if (s.hasSkillMdUrl === false) {
        noSkillMdUrl++;
        if ((s.discoveryFailCount ?? 0) >= 3) noUrlExhausted++;
      }
      if (s.isDelisted) delisted++;
    }

    return {
      totalSkills,
      contentFetchErrors,
      pendingContentFetch,
      pendingDiscovery,
      noSkillMdUrl,
      noUrlExhausted,
      delisted,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const recalculateStats = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | undefined;
    let isDone = false;
    const totals = {
      totalSkills: 0,
      contentFetchErrors: 0,
      pendingContentFetch: 0,
      pendingDiscovery: 0,
      noSkillMdUrl: 0,
      noUrlExhausted: 0,
      delisted: 0,
    };

    while (!isDone) {
      const result: {
        totalSkills: number;
        contentFetchErrors: number;
        pendingContentFetch: number;
        pendingDiscovery: number;
        noSkillMdUrl: number;
        noUrlExhausted: number;
        delisted: number;
        nextCursor: string;
        isDone: boolean;
      } = await ctx.runMutation(internal.devStats.recalculateStatsBatch, {
        cursor,
      });

      totals.totalSkills += result.totalSkills;
      totals.contentFetchErrors += result.contentFetchErrors;
      totals.pendingContentFetch += result.pendingContentFetch;
      totals.pendingDiscovery += result.pendingDiscovery;
      totals.noSkillMdUrl += result.noSkillMdUrl;
      totals.noUrlExhausted += result.noUrlExhausted;
      totals.delisted += result.delisted;

      cursor = result.nextCursor;
      isDone = result.isDone;
    }

    // Upsert the single stats document
    await ctx.runMutation(internal.devStats.upsertStats, {
      ...totals,
      recalculatedAt: Date.now(),
    });

    console.log(`Recalculated sync stats: ${JSON.stringify(totals)}`);
  },
});

export const upsertStats = internalMutation({
  args: {
    totalSkills: v.number(),
    contentFetchErrors: v.number(),
    pendingContentFetch: v.number(),
    pendingDiscovery: v.number(),
    noSkillMdUrl: v.number(),
    noUrlExhausted: v.number(),
    delisted: v.number(),
    recalculatedAt: v.number(),
  },
  handler: async (ctx, stats) => {
    const existing = await ctx.db.query("syncStats").first();
    if (existing) {
      await ctx.db.patch(existing._id, stats);
    } else {
      await ctx.db.insert("syncStats", stats);
    }
  },
});

const errorFilterValidator = v.union(
  v.literal("contentFetchError"),
  v.literal("pendingContentFetch"),
  v.literal("pendingDiscovery"),
  v.literal("noUrlRetrying"),
  v.literal("noUrlExhausted"),
  v.literal("delisted"),
);

export const listSkillsWithErrors = query({
  args: {
    filter: errorFilterValidator,
  },
  handler: async (ctx, { filter }) => {
    await assertAdmin(ctx);

    // All queries use summaries (~200 bytes) instead of skills (~30KB)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function mapSummary(s: any) {
      return {
        _id: s.skillDocId ?? s._id,
        source: s.source as string,
        skillId: s.skillId as string,
        name: s.name as string,
        installs: s.installs as number,
        hasContentFetchError: s.hasContentFetchError as boolean | undefined,
        skillMdUrl: s.skillMdUrl as string | undefined,
        needsDiscovery: s.needsDiscovery as boolean | undefined,
        needsContentFetch: s.needsContentFetch as boolean | undefined,
        contentFetchedAt: s.contentFetchedAt as number | undefined,
        isDelisted: s.isDelisted as boolean | undefined,
        discoveryFailCount: s.discoveryFailCount as number | undefined,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let skills: any[];

    switch (filter) {
      case "contentFetchError": {
        const results = await ctx.db
          .query("skillSummaries")
          .withIndex("by_hasContentFetchError", (q) =>
            q.eq("hasContentFetchError", true),
          )
          .collect();
        skills = results.filter((s) => s.skillDocId).map(mapSummary);
        break;
      }
      case "pendingContentFetch": {
        const results = await ctx.db
          .query("skillSummaries")
          .withIndex("by_needsContentFetch", (q) =>
            q.eq("needsContentFetch", true),
          )
          .collect();
        skills = results.filter((s) => s.skillDocId).map(mapSummary);
        break;
      }
      case "pendingDiscovery": {
        const results = await ctx.db
          .query("skillSummaries")
          .withIndex("by_needsDiscovery", (q) =>
            q.eq("needsDiscovery", true),
          )
          .collect();
        skills = results.filter((s) => s.skillDocId).map(mapSummary);
        break;
      }
      case "noUrlRetrying": {
        const results = await ctx.db
          .query("skillSummaries")
          .withIndex("by_hasSkillMdUrl", (q) => q.eq("hasSkillMdUrl", false))
          .collect();
        skills = results
          .filter((s) => s.skillDocId && (s.discoveryFailCount ?? 0) < 3)
          .map(mapSummary);
        break;
      }
      case "noUrlExhausted": {
        const results = await ctx.db
          .query("skillSummaries")
          .withIndex("by_hasSkillMdUrl", (q) => q.eq("hasSkillMdUrl", false))
          .collect();
        skills = results
          .filter((s) => s.skillDocId && (s.discoveryFailCount ?? 0) >= 3)
          .map(mapSummary);
        break;
      }
      case "delisted": {
        const results = await ctx.db
          .query("skillSummaries")
          .withIndex("by_isDelisted", (q) => q.eq("isDelisted", true))
          .collect();
        skills = results.filter((s) => s.skillDocId).map(mapSummary);
        break;
      }
    }

    return { skills };
  },
});

// ---------------------------------------------------------------------------
// Internal mutations (not callable by clients directly)
// ---------------------------------------------------------------------------

export const retryContentFetch = internalMutation({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    const skill = await ctx.db.get(skillId);
    if (!skill) return;

    await ctx.db.patch(skillId, {
      needsContentFetch: true,
      hasContentFetchError: false,
      contentFetchFailCount: 0,
    });

    const summary = await ctx.db
      .query("skillSummaries")
      .withIndex("by_source_skillId", (q) =>
        q.eq("source", skill.source).eq("skillId", skill.skillId),
      )
      .unique();
    if (summary) {
      await ctx.db.patch(summary._id, {
        needsContentFetch: true,
        hasContentFetchError: false,
      });
    }
  },
});

export const retryDiscovery = internalMutation({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    const skill = await ctx.db.get(skillId);
    if (!skill) return;

    await ctx.db.patch(skillId, {
      needsDiscovery: true,
      skillMdUrl: "",
      hasContentFetchError: false,
      contentFetchFailCount: 0,
      discoveryFailCount: 0,
    });

    const summary = await ctx.db
      .query("skillSummaries")
      .withIndex("by_source_skillId", (q) =>
        q.eq("source", skill.source).eq("skillId", skill.skillId),
      )
      .unique();
    if (summary) {
      await ctx.db.patch(summary._id, {
        needsDiscovery: true,
        skillMdUrl: "",
        hasSkillMdUrl: false,
        hasContentFetchError: false,
        discoveryFailCount: 0,
      });
    }
  },
});

export const retryBatch = internalMutation({
  args: {
    filter: v.union(
      v.literal("contentFetchError"),
      v.literal("noUrlRetrying"),
      v.literal("noUrlExhausted"),
    ),
  },
  handler: async (ctx, { filter }) => {
    let count = 0;

    if (filter === "contentFetchError") {
      const summaries = await ctx.db
        .query("skillSummaries")
        .withIndex("by_hasContentFetchError", (q) =>
          q.eq("hasContentFetchError", true),
        )
        .take(200);

      for (const summary of summaries) {
        const hasUrl = summary.skillMdUrl && summary.skillMdUrl !== "";
        if (summary.skillDocId) {
          await ctx.db.patch(summary.skillDocId, {
            hasContentFetchError: false,
            contentFetchFailCount: 0,
            ...(hasUrl
              ? { needsContentFetch: true }
              : { needsDiscovery: true, discoveryFailCount: 0 }),
          });
        }
        await ctx.db.patch(summary._id, {
          hasContentFetchError: false,
          ...(hasUrl
            ? { needsContentFetch: true }
            : { needsDiscovery: true, discoveryFailCount: 0 }),
        });
        count++;
      }
    } else if (filter === "noUrlRetrying" || filter === "noUrlExhausted") {
      const summaries = await ctx.db
        .query("skillSummaries")
        .withIndex("by_hasSkillMdUrl", (q) => q.eq("hasSkillMdUrl", false))
        .take(200);

      for (const summary of summaries) {
        if (summary.skillDocId) {
          await ctx.db.patch(summary.skillDocId, {
            needsDiscovery: true,
            skillMdUrl: "",
            hasContentFetchError: false,
            contentFetchFailCount: 0,
            discoveryFailCount: 0,
          });
        }
        await ctx.db.patch(summary._id, {
          needsDiscovery: true,
          skillMdUrl: "",
          hasSkillMdUrl: false,
          hasContentFetchError: false,
          discoveryFailCount: 0,
        });
        count++;
      }
    }

    return { count };
  },
});

// ---------------------------------------------------------------------------
// Actions (public — called from dashboard, delegate to internal mutations)
// ---------------------------------------------------------------------------

export const callRetryContentFetch = action({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    await assertAdmin(ctx);
    await ctx.runMutation(internal.devStats.retryContentFetch, { skillId });
  },
});

export const callRetryDiscovery = action({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    await assertAdmin(ctx);
    await ctx.runMutation(internal.devStats.retryDiscovery, { skillId });
  },
});

export const callRetryBatch = action({
  args: {
    filter: v.union(
      v.literal("contentFetchError"),
      v.literal("noUrlRetrying"),
      v.literal("noUrlExhausted"),
    ),
  },
  handler: async (ctx, { filter }): Promise<{ count: number }> => {
    await assertAdmin(ctx);
    return await ctx.runMutation(internal.devStats.retryBatch, { filter });
  },
});

export const triggerSync = action({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    await ctx.scheduler.runAfter(0, internal.skills.syncSkills, {});
    return { scheduled: true };
  },
});

export const triggerBackfill = action({
  args: {
    type: v.union(
      v.literal("summaries"),
      v.literal("syncFlags"),
      v.literal("retag"),
    ),
  },
  handler: async (ctx, { type }) => {
    await assertAdmin(ctx);
    switch (type) {
      case "summaries":
        await ctx.scheduler.runAfter(
          0,
          internal.skills.backfillSkillSummaries,
          {},
        );
        break;
      case "syncFlags":
        await ctx.scheduler.runAfter(
          0,
          internal.skills.backfillAllSyncFlags,
          {},
        );
        break;
      case "retag":
        await ctx.scheduler.runAfter(0, internal.skills.retagAllSkills, {});
        break;
    }
    return { scheduled: true, type };
  },
});

// One-time cleanup: fix skills stuck with needsContentFetch but no URL
export const cleanupOrphanedFetchFlags = internalMutation({
  args: {},
  handler: async (ctx) => {
    let fixed = 0;
    let cursor: string | undefined;
    let isDone = false;

    while (!isDone) {
      const paginationOpts = cursor
        ? { numItems: 200, cursor }
        : { numItems: 200, cursor: null };
      const result = await ctx.db
        .query("skillSummaries")
        .withIndex("by_needsContentFetch", (q) =>
          q.eq("needsContentFetch", true),
        )
        .paginate(paginationOpts);

      for (const s of result.page) {
        const hasUrl = s.skillMdUrl && s.skillMdUrl !== "";
        if (!hasUrl) {
          if (s.skillDocId) {
            await ctx.db.patch(s.skillDocId, {
              needsContentFetch: false,
              needsDiscovery: true,
              discoveryFailCount: 0,
              hasContentFetchError: false,
            });
          }
          await ctx.db.patch(s._id, {
            needsContentFetch: false,
            needsDiscovery: true,
            discoveryFailCount: 0,
            hasContentFetchError: false,
          });
          fixed++;
        }
      }

      cursor = result.continueCursor;
      isDone = result.isDone;
    }

    console.log(`Cleaned up ${fixed} orphaned fetch flags`);
    return { fixed };
  },
});

export const callCleanupOrphanedFetchFlags = action({
  args: {},
  handler: async (ctx): Promise<{ fixed: number }> => {
    await assertAdmin(ctx);
    return await ctx.runMutation(
      internal.devStats.cleanupOrphanedFetchFlags,
      {},
    );
  },
});

export const triggerRecalculateStats = action({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    await ctx.scheduler.runAfter(0, internal.devStats.recalculateStats, {});
    return { scheduled: true };
  },
});

const ALLOWED_URL_PREFIXES = [
  "https://raw.githubusercontent.com/",
  "https://github.com/",
];

export const probeSkillUrl = action({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    await assertAdmin(ctx);
    if (!ALLOWED_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      return { status: 0, ok: false, error: "URL not allowed" };
    }
    try {
      const res = await fetch(url, { method: "HEAD" });
      return { status: res.status, ok: res.ok };
    } catch (e) {
      return { status: 0, ok: false, error: String(e) };
    }
  },
});
