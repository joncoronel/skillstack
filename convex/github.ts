import { action } from "./_generated/server";
import { v } from "convex/values";
import { resolveDefaultBranch, fetchRepoTree } from "./lib/github";

// ---------------------------------------------------------------------------
// Package name → technology ID mapping
// ---------------------------------------------------------------------------

const PACKAGE_MAP: Record<string, string> = {
  react: "react",
  "react-dom": "react",
  "react-native": "react",
  next: "nextjs",
  vue: "vue",
  nuxt: "vue",
  svelte: "svelte",
  "@sveltejs/kit": "svelte",
  "@angular/core": "angular",
  "@angular/cli": "angular",
  tailwindcss: "tailwind",
  typescript: "typescript",
  "@supabase/supabase-js": "supabase",
  "@supabase/ssr": "supabase",
  convex: "convex",
  prisma: "prisma",
  "@prisma/client": "prisma",
  express: "node",
  fastify: "node",
  koa: "node",
  hono: "node",
  "@nestjs/core": "node",
  pg: "postgres",
  postgres: "postgres",
  "@neondatabase/serverless": "postgres",
  mongodb: "mongodb",
  mongoose: "mongodb",
  "aws-sdk": "aws",
  firebase: "firebase",
  "firebase-admin": "firebase",
  graphql: "graphql",
  "@apollo/client": "graphql",
  "@apollo/server": "graphql",
  openai: "ai",
  "@anthropic-ai/sdk": "ai",
  "@google/generative-ai": "ai",
  ai: "ai",
  langchain: "ai",
  jest: "testing",
  vitest: "testing",
  "@playwright/test": "testing",
  cypress: "testing",
  sass: "css",
  "styled-components": "css",
  "@emotion/react": "css",
};

const PREFIX_PATTERNS: [string, string][] = [
  ["@aws-sdk/", "aws"],
  ["@angular/", "angular"],
  ["@nestjs/", "node"],
  ["@sveltejs/", "svelte"],
  ["@supabase/", "supabase"],
  ["@langchain/", "ai"],
];

function mapPackages(dependencies: Record<string, string>): string[] {
  const matched = new Set<string>();

  for (const pkg of Object.keys(dependencies)) {
    const exact = PACKAGE_MAP[pkg];
    if (exact) {
      matched.add(exact);
      continue;
    }

    for (const [prefix, techId] of PREFIX_PATTERNS) {
      if (pkg.startsWith(prefix)) {
        matched.add(techId);
        break;
      }
    }
  }

  return Array.from(matched);
}

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Strip trailing slashes, .git suffix, and fragment/query
  let cleaned = url.trim().replace(/\/+$/, "").replace(/\.git$/, "");
  cleaned = cleaned.split("?")[0].split("#")[0];

  // Match github.com/owner/repo (with or without protocol)
  const match = cleaned.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/,
  );
  if (!match) return null;

  return { owner: match[1], repo: match[2] };
}

// ---------------------------------------------------------------------------
// package.json helpers
// ---------------------------------------------------------------------------

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

/** Fetch and parse a single package.json via raw.githubusercontent.com (not rate-limited). */
async function fetchPackageJson(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<PackageJson | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as PackageJson;
  } catch {
    return null;
  }
}

/** Directories that should never contain relevant package.json files. */
const EXCLUDED_SEGMENTS = [
  "node_modules",
  "test/fixtures",
  "__fixtures__",
  "__tests__",
  ".next",
  "dist",
  "build",
  "examples",
  ".cache",
  "coverage",
];

/** Check if a tree path is a relevant package.json to analyze. */
function isRelevantPackageJson(path: string): boolean {
  if (!path.endsWith("package.json")) return false;
  const segments = path.split("/");
  if (segments[segments.length - 1] !== "package.json") return false;
  const lowerPath = path.toLowerCase();
  return !EXCLUDED_SEGMENTS.some((seg) => lowerPath.includes(seg));
}

/** Sort paths: root first, then by depth (shallower first). Cap to maxCount. */
function prioritizeAndCap(paths: string[], maxCount: number): string[] {
  return paths
    .sort((a, b) => {
      if (a === "package.json") return -1;
      if (b === "package.json") return 1;
      const depthA = a.split("/").length;
      const depthB = b.split("/").length;
      if (depthA !== depthB) return depthA - depthB;
      return a.localeCompare(b);
    })
    .slice(0, maxCount);
}

/** Collect technology IDs from a package.json's dependencies. */
function collectTechnologies(
  pkg: PackageJson,
  into: Set<string>,
): void {
  const deps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };
  for (const tech of mapPackages(deps)) {
    into.add(tech);
  }
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

const MAX_PACKAGE_JSONS = 15;

export const detectTechnologies = action({
  args: { repoUrl: v.string() },
  handler: async (_ctx, { repoUrl }) => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return { error: "Invalid GitHub URL", technologies: [], repoName: "" };
    }

    const { owner, repo } = parsed;
    const repoName = `${owner}/${repo}`;

    // Phase 1: Fetch root package.json (free — raw.githubusercontent.com)
    let rootPkg: PackageJson | null = null;
    let rootBranch = "main";
    for (const branch of ["main", "master"]) {
      rootPkg = await fetchPackageJson(owner, repo, branch, "package.json");
      if (rootPkg) {
        rootBranch = branch;
        break;
      }
    }

    if (!rootPkg) {
      return {
        error: "Could not find package.json in this repository",
        technologies: [],
        repoName,
      };
    }

    const technologies = new Set<string>();
    collectTechnologies(rootPkg, technologies);

    // Check for monorepo — only hit the GitHub API if workspaces detected.
    // npm/yarn use "workspaces" in package.json, pnpm uses pnpm-workspace.yaml
    let hasWorkspaces =
      rootPkg.workspaces !== undefined && rootPkg.workspaces !== null;

    if (!hasWorkspaces) {
      // Check for pnpm-workspace.yaml (free — raw URL)
      const pnpmWorkspaceUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${rootBranch}/pnpm-workspace.yaml`;
      try {
        const res = await fetch(pnpmWorkspaceUrl, { method: "HEAD" });
        if (res.ok) hasWorkspaces = true;
      } catch {
        // Not a pnpm workspace
      }
    }

    if (!hasWorkspaces) {
      // Standard repo — done, zero API calls used
      return {
        error: null,
        technologies: Array.from(technologies),
        repoName,
      };
    }

    // Phase 2: Monorepo — discover workspace package.json files via tree API
    const defaultBranch = await resolveDefaultBranch(owner, repo);
    const branches = [defaultBranch];
    if (!branches.includes(rootBranch)) branches.push(rootBranch);
    if (!branches.includes("main")) branches.push("main");
    if (!branches.includes("master")) branches.push("master");

    const tree = await fetchRepoTree(owner, repo, branches);

    if (!tree) {
      // Tree API failed — return root results only (graceful degradation)
      return {
        error: null,
        technologies: Array.from(technologies),
        repoName,
      };
    }

    // Filter and prioritize package.json paths (skip root, already processed)
    const workspacePaths = tree.entries
      .filter(
        (e) =>
          e.type === "blob" &&
          e.path !== "package.json" &&
          isRelevantPackageJson(e.path),
      )
      .map((e) => e.path);

    const cappedPaths = prioritizeAndCap(workspacePaths, MAX_PACKAGE_JSONS);

    // Fetch all workspace package.json files in parallel (free — raw URLs)
    const results = await Promise.allSettled(
      cappedPaths.map((path) =>
        fetchPackageJson(owner, repo, tree.branch, path),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        collectTechnologies(result.value, technologies);
      }
    }

    return {
      error: null,
      technologies: Array.from(technologies),
      repoName,
    };
  },
});
