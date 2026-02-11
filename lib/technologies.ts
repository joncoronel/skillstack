export interface Technology {
  id: string;
  name: string;
  keywords: string[];
  category: string;
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

export const TECHNOLOGIES: Technology[] = [
  // Frontend
  { id: "react", name: "React", keywords: ["react"], category: "Frontend" },
  { id: "nextjs", name: "Next.js", keywords: ["nextjs", "next-js"], category: "Frontend" },
  { id: "vue", name: "Vue", keywords: ["vue", "nuxt"], category: "Frontend" },
  { id: "svelte", name: "Svelte", keywords: ["svelte", "sveltekit"], category: "Frontend" },
  { id: "angular", name: "Angular", keywords: ["angular"], category: "Frontend" },

  // Languages
  { id: "typescript", name: "TypeScript", keywords: ["typescript"], category: "Languages" },
  { id: "javascript", name: "JavaScript", keywords: ["javascript"], category: "Languages" },
  { id: "python", name: "Python", keywords: ["python", "django", "flask"], category: "Languages" },
  { id: "rust", name: "Rust", keywords: ["rust", "cargo"], category: "Languages" },
  { id: "go", name: "Go", keywords: ["golang"], category: "Languages" },
  { id: "java", name: "Java", keywords: ["java", "spring"], category: "Languages" },
  { id: "ruby", name: "Ruby", keywords: ["ruby", "rails"], category: "Languages" },
  { id: "php", name: "PHP", keywords: ["php", "laravel"], category: "Languages" },
  { id: "swift", name: "Swift", keywords: ["swift", "swiftui"], category: "Languages" },
  { id: "kotlin", name: "Kotlin", keywords: ["kotlin", "android"], category: "Languages" },

  // Styling
  { id: "tailwind", name: "Tailwind CSS", keywords: ["tailwind"], category: "Styling" },
  { id: "css", name: "CSS", keywords: ["css", "scss", "sass"], category: "Styling" },

  // Backend & APIs
  { id: "node", name: "Node.js", keywords: ["node", "express"], category: "Backend & APIs" },
  { id: "graphql", name: "GraphQL", keywords: ["graphql", "apollo"], category: "Backend & APIs" },
  { id: "rest", name: "REST APIs", keywords: ["rest-api", "openapi"], category: "Backend & APIs" },

  // Data
  { id: "postgres", name: "PostgreSQL", keywords: ["postgres"], category: "Data" },
  { id: "mysql", name: "MySQL", keywords: ["mysql"], category: "Data" },
  { id: "mongodb", name: "MongoDB", keywords: ["mongodb", "mongoose"], category: "Data" },
  { id: "redis", name: "Redis", keywords: ["redis"], category: "Data" },
  { id: "supabase", name: "Supabase", keywords: ["supabase"], category: "Data" },
  { id: "convex", name: "Convex", keywords: ["convex"], category: "Data" },
  { id: "prisma", name: "Prisma", keywords: ["prisma"], category: "Data" },
  { id: "firebase", name: "Firebase", keywords: ["firebase"], category: "Data" },

  // Cloud & Infra
  { id: "aws", name: "AWS", keywords: ["aws", "amazon"], category: "Cloud & Infra" },
  { id: "gcp", name: "Google Cloud", keywords: ["gcp", "google-cloud"], category: "Cloud & Infra" },
  { id: "azure", name: "Azure", keywords: ["azure"], category: "Cloud & Infra" },
  { id: "docker", name: "Docker", keywords: ["docker"], category: "Cloud & Infra" },
  { id: "git", name: "Git", keywords: ["git", "github"], category: "Cloud & Infra" },
  { id: "ci", name: "CI/CD", keywords: ["ci", "github-actions"], category: "Cloud & Infra" },

  // Specialties
  { id: "flutter", name: "Flutter", keywords: ["flutter", "dart"], category: "Specialties" },
  { id: "ai", name: "AI / LLM", keywords: ["ai", "llm", "openai", "claude"], category: "Specialties" },
  { id: "testing", name: "Testing", keywords: ["test", "jest", "vitest"], category: "Specialties" },
  { id: "security", name: "Security", keywords: ["security", "auth"], category: "Specialties" },
  { id: "cursor", name: "Cursor", keywords: ["cursor"], category: "Specialties" },
];
