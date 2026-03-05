/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: {
  bundles: {
    createBundle: FunctionReference<
      "mutation",
      "public",
      {
        isPublic: boolean;
        name: string;
        skills: Array<{ skillId: string; source: string }>;
      },
      any
    >;
    deleteBundle: FunctionReference<
      "mutation",
      "public",
      { bundleId: Id<"bundles"> },
      any
    >;
    generateShareToken: FunctionReference<
      "mutation",
      "public",
      { bundleId: Id<"bundles"> },
      any
    >;
    getByUrlId: FunctionReference<
      "query",
      "public",
      { shareToken?: string; urlId: string },
      any
    >;
    listByUser: FunctionReference<"query", "public", {}, any>;
    listPublic: FunctionReference<"query", "public", { limit?: number }, any>;
    revokeShareToken: FunctionReference<
      "mutation",
      "public",
      { bundleId: Id<"bundles"> },
      any
    >;
    updateBundleName: FunctionReference<
      "mutation",
      "public",
      { bundleId: Id<"bundles">; name: string },
      any
    >;
    updateBundleVisibility: FunctionReference<
      "mutation",
      "public",
      { bundleId: Id<"bundles">; isPublic: boolean },
      any
    >;
  };
  github: {
    detectTechnologies: FunctionReference<
      "action",
      "public",
      { repoUrl: string },
      any
    >;
  };
  skills: {
    getBySourceAndSkillId: FunctionReference<
      "query",
      "public",
      { skillId: string; source: string },
      any
    >;
    getContent: FunctionReference<
      "query",
      "public",
      { skillId: string; source: string },
      any
    >;
    list: FunctionReference<
      "query",
      "public",
      { leaderboard?: string; limit?: number },
      any
    >;
    listAllSkillSummaries: FunctionReference<
      "query",
      "public",
      {
        paginationOpts: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
      },
      any
    >;
    listByTechnologies: FunctionReference<
      "query",
      "public",
      { techLimits?: Record<string, number>; technologies: Array<string> },
      any
    >;
    listSkillSummaries: FunctionReference<
      "query",
      "public",
      {
        paginationOpts: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
      },
      any
    >;
  };
};

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: {
  generated: {
    auth: {
      create: FunctionReference<
        "mutation",
        "internal",
        { input: { data: any; model: string }; select?: Array<string> },
        any
      >;
      deleteMany: FunctionReference<
        "mutation",
        "internal",
        {
          input: { model: string; where?: Array<any> };
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        any
      >;
      deleteOne: FunctionReference<
        "mutation",
        "internal",
        { input: { model: string; where?: Array<any> } },
        any
      >;
      findMany: FunctionReference<
        "query",
        "internal",
        {
          join?: any;
          limit?: number;
          model: string;
          offset?: number;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          sortBy?: { direction: "asc" | "desc"; field: string };
          where?: Array<{
            connector?: "AND" | "OR";
            field: string;
            operator?:
              | "lt"
              | "lte"
              | "gt"
              | "gte"
              | "eq"
              | "in"
              | "not_in"
              | "ne"
              | "contains"
              | "starts_with"
              | "ends_with";
            value:
              | string
              | number
              | boolean
              | Array<string>
              | Array<number>
              | null;
          }>;
        },
        any
      >;
      findOne: FunctionReference<
        "query",
        "internal",
        {
          join?: any;
          model: string;
          select?: Array<string>;
          where?: Array<{
            connector?: "AND" | "OR";
            field: string;
            operator?:
              | "lt"
              | "lte"
              | "gt"
              | "gte"
              | "eq"
              | "in"
              | "not_in"
              | "ne"
              | "contains"
              | "starts_with"
              | "ends_with";
            value:
              | string
              | number
              | boolean
              | Array<string>
              | Array<number>
              | null;
          }>;
        },
        any
      >;
      getLatestJwks: FunctionReference<"action", "internal", {}, any>;
      rotateKeys: FunctionReference<"action", "internal", {}, any>;
      updateMany: FunctionReference<
        "mutation",
        "internal",
        {
          input: { model: string; update: any; where?: Array<any> };
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        any
      >;
      updateOne: FunctionReference<
        "mutation",
        "internal",
        { input: { model: string; update: any; where?: Array<any> } },
        any
      >;
    };
  };
  githubCache: {
    cleanupExpiredCache: FunctionReference<"mutation", "internal", {}, any>;
    getTreeCache: FunctionReference<"query", "internal", { repo: string }, any>;
    setTreeCache: FunctionReference<
      "mutation",
      "internal",
      {
        branch: string;
        dependencyFilePaths: Array<string>;
        etag: string;
        repo: string;
      },
      any
    >;
    touchTreeCache: FunctionReference<
      "mutation",
      "internal",
      { repo: string },
      any
    >;
  };
  skills: {
    backfillDiscoverUrls: FunctionReference<
      "action",
      "internal",
      { cursor?: string },
      any
    >;
    backfillFetchContent: FunctionReference<
      "action",
      "internal",
      { cursor?: string },
      any
    >;
    backfillSkillSummaries: FunctionReference<"action", "internal", {}, any>;
    backfillSkillSummariesBatch: FunctionReference<
      "mutation",
      "internal",
      { cursor?: string },
      any
    >;
    discoverSkillMdUrls: FunctionReference<
      "action",
      "internal",
      { skills: Array<{ docId: string; skillId: string }>; source: string },
      any
    >;
    fetchSkillContent: FunctionReference<
      "action",
      "internal",
      { skillId: Id<"skills"> },
      any
    >;
    getById: FunctionReference<
      "query",
      "internal",
      { skillId: Id<"skills"> },
      any
    >;
    listSkillIdsForRetag: FunctionReference<
      "query",
      "internal",
      { cursor?: string; limit: number },
      any
    >;
    listSkillsNeedingContentFetch: FunctionReference<
      "query",
      "internal",
      { cursor?: string },
      any
    >;
    listSourcesNeedingDiscovery: FunctionReference<
      "query",
      "internal",
      { cursor?: string },
      any
    >;
    markContentFetched: FunctionReference<
      "mutation",
      "internal",
      { skillId: Id<"skills"> },
      any
    >;
    retagAllSkills: FunctionReference<"action", "internal", {}, any>;
    retagBatch: FunctionReference<
      "mutation",
      "internal",
      { skillIds: Array<Id<"skills">> },
      any
    >;
    syncSkills: FunctionReference<"action", "internal", {}, any>;
    updateDescription: FunctionReference<
      "mutation",
      "internal",
      {
        content?: string;
        description?: string;
        skillId: Id<"skills">;
        skillMdUrl: string;
      },
      any
    >;
    updateSkillMdUrl: FunctionReference<
      "mutation",
      "internal",
      { docId: Id<"skills">; skillMdUrl: string },
      any
    >;
    upsertSkillsBatch: FunctionReference<
      "mutation",
      "internal",
      {
        leaderboard: string;
        skills: Array<{
          installs: number;
          name: string;
          skillId: string;
          source: string;
        }>;
      },
      any
    >;
  };
};

export declare const components: {};
