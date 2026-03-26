import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    externalId: v.string(),
  }).index("byExternalId", ["externalId"]),

  skills: defineTable({
    source: v.string(),
    skillId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    installs: v.number(),
    technologies: v.array(v.string()),
    leaderboard: v.string(),
    skillMdUrl: v.optional(v.string()),
    contentFetchedAt: v.optional(v.number()),
    contentUpdatedAt: v.optional(v.number()),
    lastSynced: v.number(),
    syncHash: v.optional(v.string()),
    needsDiscovery: v.optional(v.boolean()),
    needsContentFetch: v.optional(v.boolean()),
    contentFetchFailCount: v.optional(v.number()),
    hasContentFetchError: v.optional(v.boolean()),
    lastSeenInApi: v.optional(v.number()),
    isDelisted: v.optional(v.boolean()),
  })
    .index("by_leaderboard", ["leaderboard"])
    .index("by_source_skillId", ["source", "skillId"])
    .index("by_needsDiscovery", ["needsDiscovery"])
    .index("by_needsContentFetch", ["needsContentFetch"])
    .index("by_isDelisted", ["isDelisted"])
    .index("by_leaderboard_active", ["leaderboard", "isDelisted"])
    .searchIndex("search_name", { searchField: "name" }),

  skillSummaries: defineTable({
    source: v.string(),
    skillId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    installs: v.number(),
    technologies: v.array(v.string()),
    syncHash: v.optional(v.string()),
    lastSeenInApi: v.optional(v.number()),
    isDelisted: v.optional(v.boolean()),
    // Denormalized from skills table to avoid reading full 30KB+ skill docs
    skillDocId: v.optional(v.id("skills")),
    contentFetchedAt: v.optional(v.number()),
    skillMdUrl: v.optional(v.string()),
    needsContentFetch: v.optional(v.boolean()),
    needsDiscovery: v.optional(v.boolean()),
  })
    .index("by_source_skillId", ["source", "skillId"])
    .index("by_isDelisted", ["isDelisted"])
    .index("by_needsContentFetch", ["needsContentFetch"])
    .index("by_needsDiscovery", ["needsDiscovery"]),

  skillTechnologies: defineTable({
    skillId: v.id("skills"),
    technology: v.string(),
    installs: v.number(),
    weight: v.optional(v.number()),
  })
    .index("by_technology", ["technology", "installs"])
    .index("by_skillId", ["skillId"]),

  githubTreeCache: defineTable({
    repo: v.string(),
    branch: v.string(),
    etag: v.string(),
    dependencyFilePaths: v.array(v.string()),
    cachedAt: v.number(),
  }).index("by_repo", ["repo"]),

  bundles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    urlId: v.string(),
    skills: v.array(
      v.object({
        source: v.string(),
        skillId: v.string(),
        addedAt: v.optional(v.number()),
      }),
    ),
    isPublic: v.boolean(),
    shareToken: v.optional(v.string()),
    forkedFrom: v.optional(v.id("bundles")),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_urlId", ["urlId"])
    .index("by_public_createdAt", ["isPublic", "createdAt"]),

  bundleEvents: defineTable({
    bundleId: v.id("bundles"),
    eventType: v.union(
      v.literal("view"),
      v.literal("copy"),
      v.literal("fork"),
    ),
    userId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_bundle_createdAt", ["bundleId", "createdAt"])
    .index("by_type_createdAt", ["eventType", "createdAt"]),

  bundleStats: defineTable({
    bundleId: v.id("bundles"),
    viewCount: v.number(),
    copyCount: v.number(),
    forkCount: v.number(),
    recentCopyCount: v.number(),
    lastEventAt: v.number(),
  })
    .index("by_bundleId", ["bundleId"])
    .index("by_recentCopies", ["recentCopyCount"]),
});
