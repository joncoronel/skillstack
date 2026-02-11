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
  })
    .index("by_leaderboard", ["leaderboard"])
    .index("by_source_skillId", ["source", "skillId"])
    .searchIndex("search_name", { searchField: "name" }),

  skillSummaries: defineTable({
    source: v.string(),
    skillId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    installs: v.number(),
    technologies: v.array(v.string()),
  }).index("by_source_skillId", ["source", "skillId"]),

  skillTechnologies: defineTable({
    skillId: v.id("skills"),
    technology: v.string(),
    installs: v.number(),
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
    slug: v.string(),
    skills: v.array(
      v.object({
        source: v.string(),
        skillId: v.string(),
        addedAt: v.optional(v.number()),
      }),
    ),
    isPublic: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_public_createdAt", ["isPublic", "createdAt"]),
});
