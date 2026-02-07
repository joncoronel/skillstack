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
    installs: v.number(),
    technologies: v.array(v.string()),
    leaderboard: v.string(),
    skillMdUrl: v.optional(v.string()),
    lastSynced: v.number(),
  })
    .index("by_leaderboard", ["leaderboard"])
    .index("by_source_skillId", ["source", "skillId"])
    .searchIndex("search_name", { searchField: "name" }),

  skillTechnologies: defineTable({
    skillId: v.id("skills"),
    technology: v.string(),
    installs: v.number(),
  })
    .index("by_technology", ["technology", "installs"])
    .index("by_skillId", ["skillId"]),

  bundles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    skills: v.array(
      v.object({
        source: v.string(),
        skillId: v.string(),
      }),
    ),
    isPublic: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_public_createdAt", ["isPublic", "createdAt"]),
});
