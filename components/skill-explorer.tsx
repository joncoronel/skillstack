"use client";

import { useState } from "react";
import { BundleSelectionProvider } from "@/lib/bundle-selection-context";
import { TechnologySelector } from "@/components/technology-selector";
import { SkillResults } from "@/components/skill-results";
import { BundleBar } from "@/components/bundle-bar";

export function SkillExplorer() {
  const [selected, setSelected] = useState<string[]>([]);

  function handleToggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  return (
    <BundleSelectionProvider>
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          What&apos;s in your stack?
        </h2>
        <TechnologySelector selected={selected} onToggle={handleToggle} />
      </section>

      <section className="mt-10">
        <SkillResults selectedTechnologies={selected} />
      </section>

      <BundleBar />
    </BundleSelectionProvider>
  );
}
