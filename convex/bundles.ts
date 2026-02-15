import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";

// ---------------------------------------------------------------------------
// URL ID helpers
// ---------------------------------------------------------------------------

function generateUrlId(length = 10): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

async function ensureUniqueUrlId(ctx: QueryCtx): Promise<string> {
  const id = generateUrlId();
  const existing = await ctx.db
    .query("bundles")
    .withIndex("by_urlId", (q) => q.eq("urlId", id))
    .unique();
  if (!existing) return id;
  return ensureUniqueUrlId(ctx);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createBundle = mutation({
  args: {
    name: v.string(),
    skills: v.array(
      v.object({
        source: v.string(),
        skillId: v.string(),
      }),
    ),
    isPublic: v.boolean(),
  },
  handler: async (ctx, { name, skills, isPublic }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const urlId = await ensureUniqueUrlId(ctx);

    const now = Date.now();
    const bundleId = await ctx.db.insert("bundles", {
      userId: user._id,
      name,
      urlId,
      skills: skills.map((s) => ({ ...s, addedAt: now })),
      isPublic,
      createdAt: now,
    });

    return { bundleId, urlId };
  },
});

export const updateBundleVisibility = mutation({
  args: {
    bundleId: v.id("bundles"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, { bundleId, isPublic }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const bundle = await ctx.db.get(bundleId);

    if (!bundle || bundle.userId !== user._id) {
      throw new Error("Bundle not found or unauthorized");
    }

    await ctx.db.patch(bundleId, { isPublic });
  },
});

export const updateBundleName = mutation({
  args: {
    bundleId: v.id("bundles"),
    name: v.string(),
  },
  handler: async (ctx, { bundleId, name }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const bundle = await ctx.db.get(bundleId);

    if (!bundle || bundle.userId !== user._id) {
      throw new Error("Bundle not found or unauthorized");
    }

    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Name cannot be empty");
    }

    await ctx.db.patch(bundleId, { name: trimmed });
  },
});

export const generateShareToken = mutation({
  args: { bundleId: v.id("bundles") },
  handler: async (ctx, { bundleId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const bundle = await ctx.db.get(bundleId);

    if (!bundle || bundle.userId !== user._id) {
      throw new Error("Bundle not found or unauthorized");
    }

    const token = Array.from({ length: 4 }, () =>
      Math.random().toString(36).slice(2),
    ).join("");

    await ctx.db.patch(bundleId, { shareToken: token });
    return token;
  },
});

export const revokeShareToken = mutation({
  args: { bundleId: v.id("bundles") },
  handler: async (ctx, { bundleId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const bundle = await ctx.db.get(bundleId);

    if (!bundle || bundle.userId !== user._id) {
      throw new Error("Bundle not found or unauthorized");
    }

    await ctx.db.patch(bundleId, { shareToken: undefined });
  },
});

export const deleteBundle = mutation({
  args: { bundleId: v.id("bundles") },
  handler: async (ctx, { bundleId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const bundle = await ctx.db.get(bundleId);

    if (!bundle || bundle.userId !== user._id) {
      throw new Error("Bundle not found or unauthorized");
    }

    await ctx.db.delete(bundleId);
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getByUrlId = query({
  args: { urlId: v.string(), shareToken: v.optional(v.string()) },
  handler: async (ctx, { urlId, shareToken }) => {
    const bundle = await ctx.db
      .query("bundles")
      .withIndex("by_urlId", (q) => q.eq("urlId", urlId))
      .unique();

    if (!bundle) return null;

    const currentUser = await getCurrentUser(ctx);
    const isOwner = currentUser !== null && currentUser._id === bundle.userId;

    if (!bundle.isPublic) {
      const hasValidToken =
        shareToken !== undefined &&
        bundle.shareToken !== undefined &&
        shareToken === bundle.shareToken;

      if (!isOwner && !hasValidToken) return null;
    }

    const skillsWithData = await Promise.all(
      bundle.skills.map(async (s) => {
        const skill = await ctx.db
          .query("skills")
          .withIndex("by_source_skillId", (q) =>
            q.eq("source", s.source).eq("skillId", s.skillId),
          )
          .unique();

        const addedAt = s.addedAt;
        const contentUpdatedAt = skill?.contentUpdatedAt;
        const updatedSinceAdded =
          addedAt !== undefined &&
          contentUpdatedAt !== undefined &&
          contentUpdatedAt > addedAt;

        return {
          source: s.source,
          skillId: s.skillId,
          name: skill?.name ?? s.skillId,
          description: skill?.description,
          installs: skill?.installs ?? 0,
          technologies: skill?.technologies ?? [],
          updatedSinceAdded,
        };
      }),
    );

    const creator = await ctx.db.get(bundle.userId);

    return {
      _id: bundle._id,
      name: bundle.name,
      urlId: bundle.urlId,
      isPublic: bundle.isPublic,
      createdAt: bundle.createdAt,
      skills: skillsWithData,
      creatorName: creator?.name ?? "Anonymous",
      isOwner,
      shareToken: isOwner ? bundle.shareToken : undefined,
    };
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("bundles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const listPublic = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 30 }) => {
    const bundles = await ctx.db
      .query("bundles")
      .withIndex("by_public_createdAt", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(limit);

    return Promise.all(
      bundles.map(async (bundle) => {
        const creator = await ctx.db.get(bundle.userId);

        const techSet = new Set<string>();
        for (const s of bundle.skills) {
          const skill = await ctx.db
            .query("skills")
            .withIndex("by_source_skillId", (q) =>
              q.eq("source", s.source).eq("skillId", s.skillId),
            )
            .unique();
          if (skill) {
            skill.technologies.forEach((t) => techSet.add(t));
          }
        }

        return {
          _id: bundle._id,
          name: bundle.name,
          urlId: bundle.urlId,
          skillCount: bundle.skills.length,
          createdAt: bundle.createdAt,
          creatorName: creator?.name ?? "Anonymous",
          creatorImage: creator?.image,
          technologies: Array.from(techSet),
        };
      }),
    );
  },
});

