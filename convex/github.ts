import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { resolveDefaultBranch, fetchRepoTree, NOT_MODIFIED } from "./lib/github";

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
// Non-JS ecosystem detection
// ---------------------------------------------------------------------------

const NON_JS_DEPENDENCY_FILES = [
  "requirements.txt",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "Dockerfile",
] as const;

/** File presence → base technology ID. */
const FILE_TECH_MAP: Record<string, string> = {
  "requirements.txt": "python",
  "pyproject.toml": "python",
  "Cargo.toml": "rust",
  "go.mod": "go",
  "Dockerfile": "docker",
};

const PYTHON_PACKAGE_MAP: Record<string, string> = {
  django: "python",
  flask: "python",
  fastapi: "python",
  starlette: "python",
  pytest: "testing",
  "psycopg2": "postgres",
  "psycopg2-binary": "postgres",
  asyncpg: "postgres",
  sqlalchemy: "postgres",
  pymongo: "mongodb",
  motor: "mongodb",
  boto3: "aws",
  openai: "ai",
  anthropic: "ai",
  langchain: "ai",
  "firebase-admin": "firebase",
  tailwindcss: "tailwind",
  typescript: "typescript",
};

const RUST_CRATE_MAP: Record<string, string> = {
  tokio: "rust",
  "actix-web": "rust",
  axum: "rust",
  rocket: "rust",
  sqlx: "postgres",
  diesel: "postgres",
  mongodb: "mongodb",
};

const RUST_PREFIX_PATTERNS: [string, string][] = [
  ["aws-sdk-", "aws"],
];

const GO_MODULE_MAP: Record<string, string> = {
  "github.com/gin-gonic/gin": "go",
  "github.com/labstack/echo": "go",
  "github.com/gofiber/fiber": "go",
  "github.com/lib/pq": "postgres",
  "github.com/jackc/pgx": "postgres",
  "go.mongodb.org/mongo-driver": "mongodb",
  "github.com/aws/aws-sdk-go": "aws",
  "github.com/sashabaranov/go-openai": "ai",
};

function parseRequirementsTxt(content: string): string[] {
  const techs = new Set<string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
    const pkgName = trimmed.split(/[=<>!~\[;@\s]/)[0].toLowerCase();
    if (pkgName && PYTHON_PACKAGE_MAP[pkgName]) {
      techs.add(PYTHON_PACKAGE_MAP[pkgName]);
    }
  }
  return Array.from(techs);
}

function parsePyprojectToml(content: string): string[] {
  const techs = new Set<string>();
  const depsMatch = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (depsMatch) {
    const pkgMatches = depsMatch[1].matchAll(/["']([a-zA-Z0-9_-]+)/g);
    for (const m of pkgMatches) {
      const pkgName = m[1].toLowerCase();
      if (PYTHON_PACKAGE_MAP[pkgName]) {
        techs.add(PYTHON_PACKAGE_MAP[pkgName]);
      }
    }
  }
  return Array.from(techs);
}

function parseCargoToml(content: string): string[] {
  const techs = new Set<string>();
  const depsMatch = content.match(
    /\[(?:dev-)?dependencies\]([\s\S]*?)(?=\n\[|\s*$)/g,
  );
  if (depsMatch) {
    for (const section of depsMatch) {
      for (const line of section.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("["))
          continue;
        const crateName = trimmed.split(/[\s=]/)[0];
        if (!crateName) continue;
        if (RUST_CRATE_MAP[crateName]) {
          techs.add(RUST_CRATE_MAP[crateName]);
        }
        for (const [prefix, techId] of RUST_PREFIX_PATTERNS) {
          if (crateName.startsWith(prefix)) {
            techs.add(techId);
            break;
          }
        }
      }
    }
  }
  return Array.from(techs);
}

function parseGoMod(content: string): string[] {
  const techs = new Set<string>();

  function matchModule(modulePath: string) {
    if (GO_MODULE_MAP[modulePath]) {
      techs.add(GO_MODULE_MAP[modulePath]);
      return;
    }
    for (const [path, techId] of Object.entries(GO_MODULE_MAP)) {
      if (modulePath.startsWith(path)) {
        techs.add(techId);
        return;
      }
    }
  }

  // Multi-line require blocks
  const requireMatch = content.match(/require\s*\(([\s\S]*?)\)/g);
  if (requireMatch) {
    for (const block of requireMatch) {
      for (const line of block.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("require") || trimmed === ")") continue;
        const modulePath = trimmed.split(/\s/)[0];
        if (modulePath) matchModule(modulePath);
      }
    }
  }

  // Single-line require statements
  const singleRequires = content.matchAll(/^require\s+(\S+)\s/gm);
  for (const m of singleRequires) {
    matchModule(m[1]);
  }

  return Array.from(techs);
}

function parseNonJsDependencyFile(
  filename: string,
  content: string,
): string[] {
  switch (filename) {
    case "requirements.txt":
      return parseRequirementsTxt(content);
    case "pyproject.toml":
      return parsePyprojectToml(content);
    case "Cargo.toml":
      return parseCargoToml(content);
    case "go.mod":
      return parseGoMod(content);
    default:
      return [];
  }
}

/** Fetch a raw file from GitHub (not rate-limited). */
async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
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

/** Fetch package.json + non-JS files for a given branch in parallel. */
async function fetchAllDependencyFiles(
  owner: string,
  repo: string,
  branch: string,
): Promise<{
  packageJson: PackageJson | null;
  nonJsFiles: Map<string, string>;
}> {
  const [pkgResult, ...nonJsResults] = await Promise.allSettled([
    fetchPackageJson(owner, repo, branch, "package.json"),
    ...NON_JS_DEPENDENCY_FILES.map(async (file) => {
      const content = await fetchRawFile(owner, repo, branch, file);
      return { file, content };
    }),
  ]);

  const packageJson =
    pkgResult.status === "fulfilled" ? pkgResult.value : null;

  const nonJsFiles = new Map<string, string>();
  for (const r of nonJsResults) {
    if (r.status === "fulfilled" && r.value.content) {
      nonJsFiles.set(r.value.file, r.value.content);
    }
  }

  return { packageJson, nonJsFiles };
}

/** Process non-JS dependency files and add detected technologies. */
function processNonJsFiles(
  nonJsFiles: Map<string, string>,
  into: Set<string>,
): void {
  for (const [file, content] of nonJsFiles) {
    // File presence implies the base technology
    const baseTech = FILE_TECH_MAP[file];
    if (baseTech) into.add(baseTech);

    // Parse file contents for deeper dependency detection
    for (const tech of parseNonJsDependencyFile(file, content)) {
      into.add(tech);
    }
  }
}

/** Fetch workspace package.json files and collect their technologies. */
async function fetchAndCollectWorkspacePackages(
  owner: string,
  repo: string,
  branch: string,
  allPaths: string[],
  into: Set<string>,
): Promise<void> {
  const cappedPaths = prioritizeAndCap(allPaths, MAX_PACKAGE_JSONS);
  const results = await Promise.allSettled(
    cappedPaths.map((path) => fetchPackageJson(owner, repo, branch, path)),
  );
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      collectTechnologies(result.value, into);
    }
  }
}

export const detectTechnologies = action({
  args: { repoUrl: v.string() },
  handler: async (ctx, { repoUrl }) => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return { error: "Invalid GitHub URL", technologies: [], repoName: "" };
    }

    const { owner, repo } = parsed;
    const repoName = `${owner}/${repo}`;

    // Phase 1: Fetch all dependency files in parallel (free — raw URLs)
    // Try "main" branch first
    let { packageJson: rootPkg, nonJsFiles } = await fetchAllDependencyFiles(
      owner,
      repo,
      "main",
    );
    let rootBranch = "main";

    // If nothing found on "main", try "master"
    if (!rootPkg && nonJsFiles.size === 0) {
      const masterResult = await fetchAllDependencyFiles(
        owner,
        repo,
        "master",
      );
      rootPkg = masterResult.packageJson;
      nonJsFiles = masterResult.nonJsFiles;
      rootBranch = "master";
    }

    // If still nothing found, return error
    if (!rootPkg && nonJsFiles.size === 0) {
      return {
        error: "Could not find any dependency files in this repository",
        technologies: [],
        repoName,
      };
    }

    const technologies = new Set<string>();

    // Process JS dependencies
    if (rootPkg) {
      collectTechnologies(rootPkg, technologies);
    }

    // Process non-JS dependencies
    processNonJsFiles(nonJsFiles, technologies);

    // Phase 2: Monorepo detection (only if JS package.json found)
    if (rootPkg) {
      // Check for workspaces — npm/yarn in package.json, pnpm in yaml
      let hasWorkspaces =
        rootPkg.workspaces !== undefined && rootPkg.workspaces !== null;

      if (!hasWorkspaces) {
        const pnpmWorkspaceUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${rootBranch}/pnpm-workspace.yaml`;
        try {
          const res = await fetch(pnpmWorkspaceUrl, { method: "HEAD" });
          if (res.ok) hasWorkspaces = true;
        } catch {
          // Not a pnpm workspace
        }
      }

      if (hasWorkspaces) {
        const repoKey = `${owner}/${repo}`;

        // Check tree cache first
        const cache = await ctx.runQuery(
          internal.githubCache.getTreeCache,
          { repo: repoKey },
        );

        if (cache && !cache.isExpired) {
          // Cache hit within TTL — skip API entirely
          await fetchAndCollectWorkspacePackages(
            owner,
            repo,
            cache.branch,
            cache.dependencyFilePaths,
            technologies,
          );
        } else {
          // Cache miss or expired — make a (possibly conditional) tree request
          const defaultBranch = await resolveDefaultBranch(owner, repo);
          const branches = [defaultBranch];
          if (!branches.includes(rootBranch)) branches.push(rootBranch);
          if (!branches.includes("main")) branches.push("main");
          if (!branches.includes("master")) branches.push("master");

          const treeResult = await fetchRepoTree(owner, repo, branches, {
            etag: cache?.etag,
          });

          if (treeResult === NOT_MODIFIED) {
            // 304 — content unchanged, refresh cache and use cached paths
            await ctx.runMutation(
              internal.githubCache.touchTreeCache,
              { repo: repoKey },
            );
            await fetchAndCollectWorkspacePackages(
              owner,
              repo,
              cache!.branch,
              cache!.dependencyFilePaths,
              technologies,
            );
          } else if (treeResult) {
            // Fresh tree response — filter, cache, and process
            const workspacePaths = treeResult.entries
              .filter(
                (e) =>
                  e.type === "blob" &&
                  e.path !== "package.json" &&
                  isRelevantPackageJson(e.path),
              )
              .map((e) => e.path);

            // Update cache
            if (treeResult.etag) {
              await ctx.runMutation(
                internal.githubCache.setTreeCache,
                {
                  repo: repoKey,
                  branch: treeResult.branch,
                  etag: treeResult.etag,
                  dependencyFilePaths: workspacePaths,
                },
              );
            }

            await fetchAndCollectWorkspacePackages(
              owner,
              repo,
              treeResult.branch,
              workspacePaths,
              technologies,
            );
          }
          // If treeResult is null, tree API failed — graceful degradation
        }
      }
    }

    return {
      error: null,
      technologies: Array.from(technologies),
      repoName,
    };
  },
});
