/**
 * Maps npm package names to technology IDs used in the TECHNOLOGIES list.
 * Used by the GitHub auto-detection feature to match dependencies to technologies.
 */

const PACKAGE_MAP: Record<string, string> = {
  // React ecosystem
  react: "react",
  "react-dom": "react",
  "react-native": "react",
  // Next.js
  next: "nextjs",
  // Vue ecosystem
  vue: "vue",
  nuxt: "vue",
  // Svelte
  svelte: "svelte",
  "@sveltejs/kit": "svelte",
  // Angular
  "@angular/core": "angular",
  "@angular/cli": "angular",
  // Tailwind CSS
  tailwindcss: "tailwind",
  "@tailwindcss/typography": "tailwind",
  "@tailwindcss/forms": "tailwind",
  // TypeScript
  typescript: "typescript",
  // Supabase
  "@supabase/supabase-js": "supabase",
  "@supabase/ssr": "supabase",
  "@supabase/auth-helpers-nextjs": "supabase",
  // Convex
  convex: "convex",
  // Prisma
  prisma: "prisma",
  "@prisma/client": "prisma",
  // Node.js frameworks
  express: "node",
  fastify: "node",
  koa: "node",
  hono: "node",
  "@nestjs/core": "node",
  // PostgreSQL
  pg: "postgres",
  postgres: "postgres",
  "@neondatabase/serverless": "postgres",
  knex: "postgres",
  // MongoDB
  mongodb: "mongodb",
  mongoose: "mongodb",
  // Docker (unlikely in package.json but included)
  dockerode: "docker",
  // AWS
  "aws-sdk": "aws",
  // Firebase
  firebase: "firebase",
  "firebase-admin": "firebase",
  // GraphQL
  graphql: "graphql",
  "@apollo/client": "graphql",
  "@apollo/server": "graphql",
  "graphql-request": "graphql",
  urql: "graphql",
  // AI / LLM
  openai: "ai",
  "@anthropic-ai/sdk": "ai",
  "@google/generative-ai": "ai",
  "ai": "ai",
  langchain: "ai",
  "@langchain/core": "ai",
  // Testing
  jest: "testing",
  vitest: "testing",
  "@playwright/test": "testing",
  cypress: "testing",
  mocha: "testing",
  // CSS preprocessors
  sass: "css",
  less: "css",
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
  ["@google-cloud/", "aws"], // maps to generic cloud; could add gcp if needed
  ["@azure/", "aws"], // maps to generic cloud; could add azure if needed
];

export function mapPackagesToTechnologies(
  dependencies: Record<string, string>,
): string[] {
  const matched = new Set<string>();

  for (const pkg of Object.keys(dependencies)) {
    // Check exact match first
    const exact = PACKAGE_MAP[pkg];
    if (exact) {
      matched.add(exact);
      continue;
    }

    // Check prefix patterns
    for (const [prefix, techId] of PREFIX_PATTERNS) {
      if (pkg.startsWith(prefix)) {
        matched.add(techId);
        break;
      }
    }
  }

  return Array.from(matched);
}
