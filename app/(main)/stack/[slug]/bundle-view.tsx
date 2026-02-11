"use client";

import { useState } from "react";
import Link from "next/link";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SkillCard } from "@/components/skill-card";
import { SkillDetailSheet } from "@/components/skill-detail-sheet";
import { InstallCommands } from "@/components/install-commands";
import { Button } from "@/components/ui/cubby-ui/button";

interface BundleViewProps {
  preloadedBundle: Preloaded<typeof api.bundles.getBySlug>;
}

interface SkillInfo {
  source: string;
  skillId: string;
  name: string;
  description?: string;
  installs: number;
  technologies: string[];
  updatedSinceAdded?: boolean;
}

export function BundleView({ preloadedBundle }: BundleViewProps) {
  const bundle = usePreloadedQuery(preloadedBundle);
  const [activeSkill, setActiveSkill] = useState<SkillInfo | null>(null);

  if (bundle === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-24 text-center">
        <h1 className="text-2xl font-bold">Bundle not found</h1>
        <p className="mt-2 text-muted-foreground">
          This bundle may have been deleted or the link is incorrect.
        </p>
        <Button
          variant="primary"
          className="mt-6"
          nativeButton={false}
          render={<Link href="/" />}
        >
          Back to home
        </Button>
      </div>
    );
  }

  const updatedCount = bundle.skills.filter((s) => s.updatedSinceAdded).length;

  return (
    <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{bundle.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          by {bundle.creatorName} &middot; {bundle.skills.length} skill
          {bundle.skills.length !== 1 ? "s" : ""}
        </p>
      </div>

      {updatedCount > 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300">
          {updatedCount} skill{updatedCount !== 1 ? "s have" : " has"} been
          updated since you saved this bundle. Re-run the install commands to
          get the latest versions.
        </div>
      )}

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
              updatedSinceAdded={skill.updatedSinceAdded}
              onViewDetail={() => setActiveSkill(skill)}
            />
          ))}
        </div>
      </section>

      <SkillDetailSheet
        open={activeSkill !== null}
        onOpenChange={(open) => {
          if (!open) setActiveSkill(null);
        }}
        skill={activeSkill}
      />
    </main>
  );
}
