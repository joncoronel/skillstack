// ---------------------------------------------------------------------------
// Unified Technology Registry — single source of truth
//
// All technology definitions live here. Skill tagging (TECH_KEYWORDS,
// CONTENT_KEYWORDS), repo detection (CONFIG_FILE_MAP), alias resolution
// (TECH_ALIASES), and the frontend display (TECHNOLOGIES) are all derived
// from this registry. Adding a technology is a single-place change.
// ---------------------------------------------------------------------------

export interface TechnologyDef {
  id: string;
  name: string;
  category: string;
  /** Tier 1: keywords matched against skill name/skillId */
  nameKeywords: string[];
  /** Tier 2: specific phrases matched against skill description/content */
  contentPhrases: string[];
  /** Common name variations that map to this technology */
  aliases: string[];
  /** Config files whose presence signals this technology (for repo detection) */
  configFiles: string[];
}

export const TECHNOLOGY_CATEGORIES = [
  "Frontend",
  "Languages",
  "Styling",
  "Backend & APIs",
  "Data",
  "Cloud & Infra",
  "Specialties",
] as const;

export const TECHNOLOGY_REGISTRY: TechnologyDef[] = [
  // ── Frontend ──────────────────────────────────────────────────────────
  {
    id: "react",
    name: "React",
    category: "Frontend",
    nameKeywords: ["react", "jsx", "hooks"],
    contentPhrases: [
      "react component", "usestate", "useeffect", "react hook",
      "react-dom", "jsx component", "react app",
    ],
    aliases: ["react", "reactjs", "react.js"],
    configFiles: [],
  },
  {
    id: "nextjs",
    name: "Next.js",
    category: "Frontend",
    nameKeywords: ["nextjs", "next-js", "next.js"],
    contentPhrases: [
      "app router", "pages router", "next/image", "next/link",
      "getserversideprops", "getstaticprops", "next.js app", "nextjs app",
    ],
    aliases: ["next", "nextjs", "next.js"],
    configFiles: ["next.config.js", "next.config.ts", "next.config.mjs"],
  },
  {
    id: "vue",
    name: "Vue",
    category: "Frontend",
    nameKeywords: ["vue", "vuejs", "nuxt"],
    contentPhrases: [
      "vue component", "vue 3", "vue.js app", "vue plugin",
      "composition api", "options api",
    ],
    aliases: ["vue", "vuejs", "vue.js"],
    configFiles: ["nuxt.config.ts", "nuxt.config.js"],
  },
  {
    id: "svelte",
    name: "Svelte",
    category: "Frontend",
    nameKeywords: ["svelte", "sveltekit"],
    contentPhrases: [
      "svelte component", "svelte store", "sveltekit app", "svelte app",
    ],
    aliases: ["svelte", "sveltekit"],
    configFiles: ["svelte.config.js", "svelte.config.ts"],
  },
  {
    id: "angular",
    name: "Angular",
    category: "Frontend",
    nameKeywords: ["angular"],
    contentPhrases: [
      "angular component", "angular module", "angular service",
      "angular app", "ngmodule",
    ],
    aliases: ["angular"],
    configFiles: ["angular.json"],
  },

  // ── Languages ─────────────────────────────────────────────────────────
  {
    id: "typescript",
    name: "TypeScript",
    category: "Languages",
    nameKeywords: ["typescript"],
    contentPhrases: [
      "typescript config", "tsconfig", "type annotation",
      "type safety", "typescript project", "type inference",
    ],
    aliases: ["typescript", "ts"],
    configFiles: ["tsconfig.json"],
  },
  {
    id: "javascript",
    name: "JavaScript",
    category: "Languages",
    nameKeywords: ["javascript"],
    contentPhrases: [
      "javascript function", "javascript project", "ecmascript",
      "vanilla js", "javascript app",
    ],
    aliases: ["javascript", "js"],
    configFiles: [],
  },
  {
    id: "python",
    name: "Python",
    category: "Languages",
    nameKeywords: ["python", "django", "flask", "fastapi"],
    contentPhrases: [
      "python script", "python package", "pip install",
      "python function", "python project", "python class",
    ],
    aliases: ["python", "py"],
    configFiles: [],
  },
  {
    id: "rust",
    name: "Rust",
    category: "Languages",
    nameKeywords: ["rust", "cargo"],
    contentPhrases: [
      "rust project", "cargo.toml", "rust function",
      "rust crate", "rust code",
    ],
    aliases: ["rust"],
    configFiles: [],
  },
  {
    id: "go",
    name: "Go",
    category: "Languages",
    nameKeywords: ["golang"],
    contentPhrases: [
      "go module", "go function", "golang project",
      "go routine", "go code",
    ],
    aliases: ["go", "golang"],
    configFiles: [],
  },
  {
    id: "java",
    name: "Java",
    category: "Languages",
    nameKeywords: ["java", "spring", "maven", "gradle"],
    contentPhrases: [
      "java class", "java project", "spring boot",
      "maven project", "gradle project", "java application",
    ],
    aliases: ["java"],
    configFiles: [],
  },
  {
    id: "ruby",
    name: "Ruby",
    category: "Languages",
    nameKeywords: ["ruby", "rails"],
    contentPhrases: [
      "ruby on rails", "rails app", "ruby gem",
      "ruby project", "ruby class",
    ],
    aliases: ["ruby", "rails"],
    configFiles: [],
  },
  {
    id: "php",
    name: "PHP",
    category: "Languages",
    nameKeywords: ["php", "laravel"],
    contentPhrases: [
      "php project", "laravel app", "php function",
      "composer.json", "php class",
    ],
    aliases: ["php", "laravel"],
    configFiles: [],
  },
  {
    id: "swift",
    name: "Swift",
    category: "Languages",
    nameKeywords: ["swift", "swiftui", "ios"],
    contentPhrases: [
      "swift code", "swiftui view", "ios app",
      "swift project", "xcode project",
    ],
    aliases: ["swift", "swiftui"],
    configFiles: [],
  },
  {
    id: "kotlin",
    name: "Kotlin",
    category: "Languages",
    nameKeywords: ["kotlin"],
    contentPhrases: [
      "kotlin class", "android app", "kotlin project", "kotlin function",
    ],
    aliases: ["kotlin"],
    configFiles: [],
  },

  // ── Styling ───────────────────────────────────────────────────────────
  {
    id: "tailwind",
    name: "Tailwind CSS",
    category: "Styling",
    nameKeywords: ["tailwind", "tailwindcss"],
    contentPhrases: [
      "tailwind class", "tailwind config", "tailwind css",
      "tailwind utility", "tailwindcss config",
    ],
    aliases: ["tailwind", "tailwindcss", "tailwind css"],
    configFiles: [
      "tailwind.config.js", "tailwind.config.ts",
      "tailwind.config.mjs", "tailwind.config.cjs",
    ],
  },
  {
    id: "css",
    name: "CSS",
    category: "Styling",
    nameKeywords: ["css", "scss", "sass", "less"],
    contentPhrases: [
      "css style", "css architecture", "css module",
      "css framework", "css-in-js", "css best practice", "css class",
    ],
    aliases: ["css", "scss", "sass"],
    configFiles: [],
  },

  // ── Backend & APIs ────────────────────────────────────────────────────
  {
    id: "node",
    name: "Node.js",
    category: "Backend & APIs",
    nameKeywords: ["node", "express", "nestjs", "fastify"],
    contentPhrases: [
      "node.js app", "express app", "node server",
      "express server", "node.js project", "fastify server",
    ],
    aliases: ["node", "nodejs", "node.js", "express", "fastify"],
    configFiles: [],
  },
  {
    id: "graphql",
    name: "GraphQL",
    category: "Backend & APIs",
    nameKeywords: ["graphql", "apollo"],
    contentPhrases: [
      "graphql query", "graphql mutation", "graphql schema",
      "graphql resolver", "graphql api",
    ],
    aliases: ["graphql"],
    configFiles: [],
  },
  {
    id: "rest",
    name: "REST APIs",
    category: "Backend & APIs",
    nameKeywords: ["rest-api", "openapi", "swagger"],
    contentPhrases: [
      "rest api", "restful api", "api endpoint",
      "openapi spec", "swagger doc",
    ],
    aliases: ["rest", "rest api"],
    configFiles: [],
  },

  // ── Data ──────────────────────────────────────────────────────────────
  {
    id: "postgres",
    name: "PostgreSQL",
    category: "Data",
    nameKeywords: ["postgres", "postgresql"],
    contentPhrases: [
      "postgresql database", "postgres query", "sql query",
      "database migration", "postgres connection",
    ],
    aliases: ["postgres", "postgresql"],
    configFiles: [],
  },
  {
    id: "mysql",
    name: "MySQL",
    category: "Data",
    nameKeywords: ["mysql"],
    contentPhrases: [
      "mysql database", "mysql query", "mysql connection", "mysql server",
    ],
    aliases: ["mysql"],
    configFiles: [],
  },
  {
    id: "mongodb",
    name: "MongoDB",
    category: "Data",
    nameKeywords: ["mongodb", "mongoose"],
    contentPhrases: [
      "mongodb collection", "mongodb query", "mongoose model",
      "mongodb database", "mongo query",
    ],
    aliases: ["mongodb", "mongo"],
    configFiles: [],
  },
  {
    id: "redis",
    name: "Redis",
    category: "Data",
    nameKeywords: ["redis"],
    contentPhrases: [
      "redis cache", "redis client", "redis connection", "redis store",
    ],
    aliases: ["redis"],
    configFiles: [],
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "Data",
    nameKeywords: ["supabase"],
    contentPhrases: [
      "supabase client", "supabase auth", "supabase database",
      "supabase project",
    ],
    aliases: ["supabase"],
    configFiles: [],
  },
  {
    id: "convex",
    name: "Convex",
    category: "Data",
    nameKeywords: ["convex"],
    contentPhrases: [
      "convex function", "convex schema", "convex query",
      "convex mutation", "convex action",
    ],
    aliases: ["convex"],
    configFiles: [],
  },
  {
    id: "prisma",
    name: "Prisma",
    category: "Data",
    nameKeywords: ["prisma"],
    contentPhrases: [
      "prisma schema", "prisma client", "prisma migrate", "prisma model",
    ],
    aliases: ["prisma"],
    configFiles: [],
  },
  {
    id: "firebase",
    name: "Firebase",
    category: "Data",
    nameKeywords: ["firebase", "firestore"],
    contentPhrases: [
      "firebase auth", "firebase database", "firestore collection",
      "firebase project", "firebase sdk",
    ],
    aliases: ["firebase"],
    configFiles: [],
  },

  // ── Cloud & Infra ─────────────────────────────────────────────────────
  {
    id: "aws",
    name: "AWS",
    category: "Cloud & Infra",
    nameKeywords: ["aws", "amazon", "lambda", "dynamodb"],
    contentPhrases: [
      "aws service", "aws lambda", "aws s3",
      "amazon web services", "aws sdk", "aws cloud",
    ],
    aliases: ["aws"],
    configFiles: [],
  },
  {
    id: "gcp",
    name: "Google Cloud",
    category: "Cloud & Infra",
    nameKeywords: ["gcp", "google-cloud"],
    contentPhrases: [
      "google cloud", "gcp service", "cloud function",
      "google cloud platform",
    ],
    aliases: ["gcp", "google cloud"],
    configFiles: [],
  },
  {
    id: "azure",
    name: "Azure",
    category: "Cloud & Infra",
    nameKeywords: ["azure"],
    contentPhrases: [
      "azure service", "azure function", "azure cloud", "azure devops",
    ],
    aliases: ["azure"],
    configFiles: [],
  },
  {
    id: "docker",
    name: "Docker",
    category: "Cloud & Infra",
    nameKeywords: ["docker", "container", "dockerfile"],
    contentPhrases: [
      "docker container", "docker image", "docker-compose",
      "dockerfile", "docker build",
    ],
    aliases: ["docker"],
    configFiles: ["docker-compose.yml", "docker-compose.yaml"],
  },
  {
    id: "git",
    name: "Git",
    category: "Cloud & Infra",
    nameKeywords: ["git", "github", "gitlab"],
    contentPhrases: [
      "git workflow", "git branch", "git commit",
      "git hook", "github action", "git repository",
    ],
    aliases: ["git", "github"],
    configFiles: [],
  },
  {
    id: "ci",
    name: "CI/CD",
    category: "Cloud & Infra",
    nameKeywords: ["ci", "cd", "github-actions", "jenkins"],
    contentPhrases: [
      "ci/cd pipeline", "github actions", "ci pipeline",
      "continuous integration", "continuous deployment",
    ],
    aliases: ["ci", "ci/cd"],
    configFiles: [],
  },

  // ── Specialties ───────────────────────────────────────────────────────
  {
    id: "flutter",
    name: "Flutter",
    category: "Specialties",
    nameKeywords: ["flutter", "dart"],
    contentPhrases: [
      "flutter widget", "flutter app", "dart code", "flutter project",
    ],
    aliases: ["flutter", "dart"],
    configFiles: [],
  },
  {
    id: "ai",
    name: "AI / LLM",
    category: "Specialties",
    nameKeywords: ["ai", "ml", "llm", "openai", "anthropic", "claude", "gpt"],
    contentPhrases: [
      "ai model", "llm integration", "machine learning",
      "ai assistant", "ai agent", "prompt engineering", "ai coding",
    ],
    aliases: ["ai", "llm", "machine learning"],
    configFiles: [],
  },
  {
    id: "testing",
    name: "Testing",
    category: "Specialties",
    nameKeywords: ["test", "jest", "vitest", "cypress", "playwright"],
    contentPhrases: [
      "unit test", "e2e test", "test suite",
      "test coverage", "test runner", "integration test", "test case",
    ],
    aliases: ["testing", "jest", "vitest", "playwright"],
    configFiles: [
      "jest.config.js", "jest.config.ts",
      "vitest.config.ts", "vitest.config.js",
      "playwright.config.ts",
      "cypress.config.ts", "cypress.config.js",
    ],
  },
  {
    id: "security",
    name: "Security",
    category: "Specialties",
    nameKeywords: ["security", "auth", "oauth", "jwt"],
    contentPhrases: [
      "security best practice", "authentication flow",
      "authorization", "oauth flow", "jwt token", "security audit",
    ],
    aliases: ["security", "auth", "authentication"],
    configFiles: [],
  },
  {
    id: "cursor",
    name: "Cursor",
    category: "Specialties",
    nameKeywords: ["cursor-rules", "cursorrules", "cursor-ide"],
    contentPhrases: [
      "cursor rule", "cursor ide", "cursor editor", "cursor agent",
    ],
    aliases: ["cursor"],
    configFiles: [],
  },
];

// ---------------------------------------------------------------------------
// Derived lookups
// ---------------------------------------------------------------------------

/** Tier 1 keyword map: tech id → keywords for name/skillId matching */
export function buildTechKeywords(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const t of TECHNOLOGY_REGISTRY) {
    map[t.id] = t.nameKeywords;
  }
  return map;
}

/** Tier 2 content phrase map: tech id → phrases for description/content matching */
export function buildContentKeywords(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const t of TECHNOLOGY_REGISTRY) {
    if (t.contentPhrases.length > 0) {
      map[t.id] = t.contentPhrases;
    }
  }
  return map;
}

/** Config filename → tech id lookup */
export function buildConfigFileMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of TECHNOLOGY_REGISTRY) {
    for (const file of t.configFiles) {
      map[file] = t.id;
    }
  }
  return map;
}

/** Frontend-compatible technology list */
export function buildFrontendTechnologies(): Array<{
  id: string;
  name: string;
  keywords: string[];
  category: string;
}> {
  return TECHNOLOGY_REGISTRY.map((t) => ({
    id: t.id,
    name: t.name,
    keywords: t.nameKeywords,
    category: t.category,
  }));
}
