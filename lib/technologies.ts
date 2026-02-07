export interface Technology {
  id: string;
  name: string;
  keywords: string[];
}

export const TECHNOLOGIES: Technology[] = [
  { id: "react", name: "React", keywords: ["react"] },
  { id: "nextjs", name: "Next.js", keywords: ["nextjs", "next-js"] },
  { id: "vue", name: "Vue", keywords: ["vue", "nuxt"] },
  { id: "svelte", name: "Svelte", keywords: ["svelte", "sveltekit"] },
  { id: "angular", name: "Angular", keywords: ["angular"] },
  { id: "tailwind", name: "Tailwind CSS", keywords: ["tailwind"] },
  { id: "typescript", name: "TypeScript", keywords: ["typescript"] },
  { id: "python", name: "Python", keywords: ["python", "django", "flask"] },
  { id: "supabase", name: "Supabase", keywords: ["supabase"] },
  { id: "convex", name: "Convex", keywords: ["convex"] },
  { id: "prisma", name: "Prisma", keywords: ["prisma"] },
  { id: "node", name: "Node.js", keywords: ["node", "express"] },
  { id: "postgres", name: "PostgreSQL", keywords: ["postgres"] },
  { id: "mongodb", name: "MongoDB", keywords: ["mongodb", "mongoose"] },
  { id: "docker", name: "Docker", keywords: ["docker"] },
  { id: "aws", name: "AWS", keywords: ["aws", "amazon"] },
  { id: "firebase", name: "Firebase", keywords: ["firebase"] },
  { id: "graphql", name: "GraphQL", keywords: ["graphql", "apollo"] },
  { id: "rust", name: "Rust", keywords: ["rust", "cargo"] },
  { id: "go", name: "Go", keywords: ["golang"] },
  { id: "ai", name: "AI / LLM", keywords: ["ai", "llm", "openai", "claude"] },
  { id: "testing", name: "Testing", keywords: ["test", "jest", "vitest"] },
  { id: "css", name: "CSS", keywords: ["css", "scss", "sass"] },
  { id: "git", name: "Git", keywords: ["git", "github"] },
  { id: "security", name: "Security", keywords: ["security", "auth"] },
  { id: "cursor", name: "Cursor", keywords: ["cursor"] },
];
