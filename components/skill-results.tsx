"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronDownIcon } from "lucide-react";
import { SkillCard } from "@/components/skill-card";
import { SkillDetailSheet } from "@/components/skill-detail-sheet";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { Button } from "@/components/ui/cubby-ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/cubby-ui/collapsible";
import { TECHNOLOGIES } from "@/lib/technologies";

interface SkillInfo {
  source: string;
  skillId: string;
  name: string;
  description?: string;
  installs: number;
  technologies: string[];
}

interface SkillResultsProps {
  selectedTechnologies: string[];
}

const PAGE_SIZE = 20;
const techNameMap = new Map(TECHNOLOGIES.map((t) => [t.id, t.name]));

type GroupResult = {
  groups: Array<{
    technology: string;
    skills: SkillInfo[];
    hasMore: boolean;
  }>;
};

export function SkillResults({ selectedTechnologies }: SkillResultsProps) {
  const [activeSkill, setActiveSkill] = useState<SkillInfo | null>(null);
  const [techLimits, setTechLimits] = useState<Record<string, number>>({});
  const [cachedResult, setCachedResult] = useState<GroupResult | undefined>(
    undefined,
  );
  const [prevTechs, setPrevTechs] = useState(selectedTechnologies);

  const result = useQuery(
    api.skills.listByTechnologies,
    selectedTechnologies.length > 0
      ? { technologies: selectedTechnologies, techLimits }
      : "skip",
  );

  // Cache latest successful result
  if (result !== undefined && result !== cachedResult) {
    setCachedResult(result);
  }

  // Handle technology changes
  if (selectedTechnologies !== prevTechs) {
    if (
      selectedTechnologies.length !== prevTechs.length ||
      selectedTechnologies.some((t, i) => t !== prevTechs[i])
    ) {
      setTechLimits({});

      // Keep cache if there's any overlap (adding or removing from existing set).
      // Only clear if there's zero overlap (complete replacement).
      const hasOverlap = selectedTechnologies.some((t) =>
        prevTechs.includes(t),
      );
      if (!hasOverlap) {
        setCachedResult(undefined);
      } else if (cachedResult) {
        // When removing techs, filter the cached groups to only include
        // technologies that are still selected — avoids showing stale sections
        const filtered = cachedResult.groups.filter((g) =>
          selectedTechnologies.includes(g.technology),
        );
        setCachedResult({ groups: filtered });
      }

      setPrevTechs(selectedTechnologies);
    }
  }

  const isLoading = result === undefined;

  if (selectedTechnologies.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg font-medium">Select technologies above</p>
        <p className="mt-1 text-sm">
          Pick the tools in your stack to discover matching AI skills
        </p>
      </div>
    );
  }

  const displayResult = result ?? cachedResult;

  if (displayResult === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  const { groups } = displayResult;
  const loadedTechs = new Set(groups.map((g) => g.technology));
  const totalSkills = groups.reduce((sum, g) => sum + g.skills.length, 0);

  // Technologies in the selection that aren't in the display yet (still loading)
  const pendingTechs = selectedTechnologies.filter(
    (t) => !loadedTechs.has(t),
  );

  if (totalSkills === 0 && pendingTechs.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg font-medium">No skills found</p>
        <p className="mt-1 text-sm">
          Try selecting different technologies
        </p>
      </div>
    );
  }

  function handleShowMore(techId: string) {
    setTechLimits((prev) => ({
      ...prev,
      [techId]: (prev[techId] ?? PAGE_SIZE) + PAGE_SIZE,
    }));
  }

  return (
    <>
      <div className="space-y-8">
        {groups.map(({ technology, skills, hasMore }) => {
          if (skills.length === 0) return null;

          return (
            <Collapsible key={technology} defaultOpen>
              <section>
                <CollapsibleTrigger className="border-none bg-transparent shadow-none ring-0 py-1 hover:bg-transparent hover:opacity-80">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {techNameMap.get(technology) ?? technology}
                    <span className="ml-2 text-xs font-normal">
                      ({skills.length})
                    </span>
                  </h3>
                  <ChevronDownIcon className="size-4 text-muted-foreground transition-transform duration-200 group-data-[panel-open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {skills.map((skill) => (
                      <SkillCard
                        key={`${skill.source}/${skill.skillId}`}
                        name={skill.name}
                        source={skill.source}
                        skillId={skill.skillId}
                        description={skill.description}
                        installs={skill.installs}
                        technologies={skill.technologies}
                        selectable
                        onViewDetail={() => setActiveSkill(skill)}
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="flex justify-center mt-3">
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={isLoading}
                        onClick={() => handleShowMore(technology)}
                      >
                        {isLoading ? "Loading…" : "Show more"}
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </section>
            </Collapsible>
          );
        })}

        {/* Skeleton sections for newly added technologies still loading */}
        {pendingTechs.map((techId) => (
          <section key={techId}>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {techNameMap.get(techId) ?? techId}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          </section>
        ))}
      </div>

      <SkillDetailSheet
        open={activeSkill !== null}
        onOpenChange={(open) => {
          if (!open) setActiveSkill(null);
        }}
        skill={activeSkill}
      />
    </>
  );
}
