"use client";

import { useState } from "react";
import { BundleSelectionProvider } from "@/lib/bundle-selection-context";
import { TechnologySelector } from "@/components/technology-selector";
import { RepoUrlInput } from "@/components/repo-url-input";
import { SkillResults } from "@/components/skill-results";
import { BundleBar } from "@/components/bundle-bar";

export function SkillExplorer() {
  const [selected, setSelected] = useState<string[]>([]);

  function handleToggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function handleRepoDetected(technologies: string[]) {
    setSelected(technologies);
  }

  return (
    <BundleSelectionProvider>
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          What&apos;s in your stack?
        </h2>
        <RepoUrlInput onTechnologiesDetected={handleRepoDetected} />
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or select manually
            </span>
          </div>
        </div>
        <TechnologySelector selected={selected} onToggle={handleToggle} />
      </section>

      <section className="mt-10">
        <SkillResults selectedTechnologies={selected} />
      </section>

      <BundleBar />
    </BundleSelectionProvider>
  );
}
