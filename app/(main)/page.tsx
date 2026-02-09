import { SkillExplorer } from "@/components/skill-explorer";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Build your AI skill stack
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Discover, compare, and bundle skills for AI coding assistants like
          Cursor and Claude. Pick your technologies, find the best skills, and
          share your stack.
        </p>
      </section>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 pb-20">
        <SkillExplorer />
      </main>
    </>
  );
}
