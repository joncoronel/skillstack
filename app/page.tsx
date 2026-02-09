import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/cubby-ui/button";
import { UserButton } from "@clerk/nextjs";
import { SkillExplorer } from "@/components/skill-explorer";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-bold tracking-tight">SkillStack</span>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            {userId ? (
              <UserButton />
            ) : (
              <Button variant="primary" size="sm" render={<Link href="/sign-in" />}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

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
    </div>
  );
}
