"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { SkillCard } from "@/components/skill-card";
import { InstallCommands } from "@/components/install-commands";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { Button } from "@/components/ui/cubby-ui/button";

export default function BundlePage() {
  const { slug } = useParams<{ slug: string }>();
  const bundle = useQuery(api.bundles.getBySlug, { slug });

  if (bundle === undefined) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-5xl px-4 pt-12">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-5 w-40 mb-8" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (bundle === null) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-5xl px-4 pt-24 text-center">
          <h1 className="text-2xl font-bold">Bundle not found</h1>
          <p className="mt-2 text-muted-foreground">
            This bundle may have been deleted or the link is incorrect.
          </p>
          <Button
            variant="primary"
            className="mt-6"
            render={<Link href="/" />}
          >
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{bundle.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            by {bundle.creatorName} &middot; {bundle.skills.length} skill
            {bundle.skills.length !== 1 ? "s" : ""}
          </p>
        </div>

        <section className="mb-10">
          <InstallCommands skills={bundle.skills} />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Skills in this bundle
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bundle.skills.map((skill) => (
              <SkillCard
                key={`${skill.source}/${skill.skillId}`}
                name={skill.name}
                source={skill.source}
                skillId={skill.skillId}
                description={skill.description}
                installs={skill.installs}
                technologies={skill.technologies}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          SkillStack
        </Link>
      </div>
    </header>
  );
}
