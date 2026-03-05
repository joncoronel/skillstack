/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  DocumentByName,
  TableNamesInDataModel,
  SystemTableNames,
  AnyDataModel,
} from "convex/server";
import type { GenericId } from "convex/values";

/**
 * A type describing your Convex data model.
 *
 * This type includes information about what tables you have, the type of
 * documents stored in those tables, and the indexes defined on them.
 *
 * This type is used to parameterize methods like `queryGeneric` and
 * `mutationGeneric` to make them type-safe.
 */

export type DataModel = {
  account: {
    document: {
      accessToken?: null | string;
      accessTokenExpiresAt?: null | number;
      accountId: string;
      createdAt: number;
      idToken?: null | string;
      password?: null | string;
      providerId: string;
      refreshToken?: null | string;
      refreshTokenExpiresAt?: null | number;
      scope?: null | string;
      updatedAt: number;
      userId: string;
      _id: Id<"account">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "accessToken"
      | "accessTokenExpiresAt"
      | "accountId"
      | "createdAt"
      | "idToken"
      | "password"
      | "providerId"
      | "refreshToken"
      | "refreshTokenExpiresAt"
      | "scope"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      accountId: ["accountId", "_creationTime"];
      accountId_providerId: ["accountId", "providerId", "_creationTime"];
      providerId_userId: ["providerId", "userId", "_creationTime"];
      userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  bundles: {
    document: {
      createdAt: number;
      creatorImage?: string;
      creatorName?: string;
      isPublic: boolean;
      name: string;
      shareToken?: string;
      skills: Array<{ addedAt?: number; skillId: string; source: string }>;
      urlId: string;
      userId: string;
      _id: Id<"bundles">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "creatorImage"
      | "creatorName"
      | "isPublic"
      | "name"
      | "shareToken"
      | "skills"
      | "urlId"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_public_createdAt: ["isPublic", "createdAt", "_creationTime"];
      by_urlId: ["urlId", "_creationTime"];
      by_userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  githubTreeCache: {
    document: {
      branch: string;
      cachedAt: number;
      dependencyFilePaths: Array<string>;
      etag: string;
      repo: string;
      _id: Id<"githubTreeCache">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "branch"
      | "cachedAt"
      | "dependencyFilePaths"
      | "etag"
      | "repo";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_repo: ["repo", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  jwks: {
    document: {
      createdAt: number;
      expiresAt?: null | number;
      privateKey: string;
      publicKey: string;
      _id: Id<"jwks">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "expiresAt"
      | "privateKey"
      | "publicKey";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  session: {
    document: {
      createdAt: number;
      expiresAt: number;
      ipAddress?: null | string;
      token: string;
      updatedAt: number;
      userAgent?: null | string;
      userId: string;
      _id: Id<"session">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "expiresAt"
      | "ipAddress"
      | "token"
      | "updatedAt"
      | "userAgent"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      expiresAt: ["expiresAt", "_creationTime"];
      expiresAt_userId: ["expiresAt", "userId", "_creationTime"];
      token: ["token", "_creationTime"];
      userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  skills: {
    document: {
      content?: string;
      contentFetchedAt?: number;
      contentUpdatedAt?: number;
      description?: string;
      installs: number;
      lastSynced: number;
      leaderboard: string;
      name: string;
      skillId: string;
      skillMdUrl?: string;
      source: string;
      technologies: Array<string>;
      _id: Id<"skills">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "content"
      | "contentFetchedAt"
      | "contentUpdatedAt"
      | "description"
      | "installs"
      | "lastSynced"
      | "leaderboard"
      | "name"
      | "skillId"
      | "skillMdUrl"
      | "source"
      | "technologies";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_leaderboard: ["leaderboard", "_creationTime"];
      by_source_skillId: ["source", "skillId", "_creationTime"];
    };
    searchIndexes: {
      search_name: {
        searchField: "name";
        filterFields: never;
      };
    };
    vectorIndexes: {};
  };
  skillSummaries: {
    document: {
      description?: string;
      installs: number;
      name: string;
      skillId: string;
      source: string;
      technologies: Array<string>;
      _id: Id<"skillSummaries">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "description"
      | "installs"
      | "name"
      | "skillId"
      | "source"
      | "technologies";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_source_skillId: ["source", "skillId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  skillTechnologies: {
    document: {
      installs: number;
      skillId: Id<"skills">;
      technology: string;
      weight?: number;
      _id: Id<"skillTechnologies">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "installs"
      | "skillId"
      | "technology"
      | "weight";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_skillId: ["skillId", "_creationTime"];
      by_technology: ["technology", "installs", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  user: {
    document: {
      createdAt: number;
      email: string;
      emailVerified: boolean;
      image?: null | string;
      name: string;
      updatedAt: number;
      userId?: null | string;
      _id: Id<"user">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "email"
      | "emailVerified"
      | "image"
      | "name"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      email_name: ["email", "name", "_creationTime"];
      name: ["name", "_creationTime"];
      userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  verification: {
    document: {
      createdAt: number;
      expiresAt: number;
      identifier: string;
      updatedAt: number;
      value: string;
      _id: Id<"verification">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "expiresAt"
      | "identifier"
      | "updatedAt"
      | "value";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      expiresAt: ["expiresAt", "_creationTime"];
      identifier: ["identifier", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
};

/**
 * The names of all of your Convex tables.
 */
export type TableNames = TableNamesInDataModel<DataModel>;

/**
 * The type of a document stored in Convex.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Doc<TableName extends TableNames> = DocumentByName<
  DataModel,
  TableName
>;

/**
 * An identifier for a document in Convex.
 *
 * Convex documents are uniquely identified by their `Id`, which is accessible
 * on the `_id` field. To learn more, see [Document IDs](https://docs.convex.dev/using/document-ids).
 *
 * Documents can be loaded using `db.get(tableName, id)` in query and mutation functions.
 *
 * IDs are just strings at runtime, but this type can be used to distinguish them from other
 * strings when type checking.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Id<TableName extends TableNames | SystemTableNames> =
  GenericId<TableName>;
