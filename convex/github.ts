import { action } from "./_generated/server";
import { v } from "convex/values";

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
// Action
// ---------------------------------------------------------------------------

export const detectTechnologies = action({
  args: { repoUrl: v.string() },
  handler: async (_ctx, { repoUrl }) => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return { error: "Invalid GitHub URL", technologies: [], repoName: "" };
    }

    const { owner, repo } = parsed;

    // Try main branch first, then master
    let packageJson: Record<string, unknown> | null = null;
    for (const branch of ["main", "master"]) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          packageJson = (await res.json()) as Record<string, unknown>;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!packageJson) {
      return {
        error: "Could not find package.json in this repository",
        technologies: [],
        repoName: `${owner}/${repo}`,
      };
    }

    const deps = {
      ...((packageJson.dependencies as Record<string, string>) ?? {}),
      ...((packageJson.devDependencies as Record<string, string>) ?? {}),
    };

    const technologies = mapPackages(deps);

    return {
      error: null,
      technologies,
      repoName: `${owner}/${repo}`,
    };
  },
});
