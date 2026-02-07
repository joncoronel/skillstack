"use client";

import { useState } from "react";
import { TechnologySelector } from "@/components/technology-selector";
import { SkillResults } from "@/components/skill-results";

export function SkillExplorer() {
  const [selected, setSelected] = useState<string[]>([]);

  function handleToggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  return (
    <>
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          What&apos;s in your stack?
        </h2>
        <TechnologySelector selected={selected} onToggle={handleToggle} />
      </section>

      <section className="mt-10">
        <SkillResults selectedTechnologies={selected} />
      </section>
    </>
  );
}
