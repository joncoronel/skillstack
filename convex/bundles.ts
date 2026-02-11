import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

async function ensureUniqueSlug(ctx: QueryCtx, baseSlug: string) {
  const existing = await ctx.db
    .query("bundles")
    .withIndex("by_slug", (q) => q.eq("slug", baseSlug))
    .unique();

  if (!existing) return baseSlug;

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${baseSlug}-${suffix}`;
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

    const baseSlug = generateSlug(name);
    const slug = await ensureUniqueSlug(ctx, baseSlug);

    const now = Date.now();
    const bundleId = await ctx.db.insert("bundles", {
      userId: user._id,
      name,
      slug,
      skills: skills.map((s) => ({ ...s, addedAt: now })),
      isPublic,
      createdAt: now,
    });

    return { bundleId, slug };
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

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const bundle = await ctx.db
      .query("bundles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (!bundle) return null;

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
      slug: bundle.slug,
      isPublic: bundle.isPublic,
      createdAt: bundle.createdAt,
      skills: skillsWithData,
      creatorName: creator?.name ?? "Anonymous",
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
          slug: bundle.slug,
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
