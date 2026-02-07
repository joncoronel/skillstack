"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SkillCard } from "@/components/skill-card";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { TECHNOLOGIES } from "@/lib/technologies";

interface SkillResultsProps {
  selectedTechnologies: string[];
}

export function SkillResults({ selectedTechnologies }: SkillResultsProps) {
  const skills = useQuery(
    api.skills.listByTechnologies,
    selectedTechnologies.length > 0
      ? { technologies: selectedTechnologies }
      : "skip",
  );

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

  if (skills === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg font-medium">No skills found</p>
        <p className="mt-1 text-sm">
          Try selecting different technologies
        </p>
      </div>
    );
  }

  // Group skills by the first matching selected technology
  const techMap = new Map(TECHNOLOGIES.map((t) => [t.id, t.name]));
  const grouped = new Map<string, typeof skills>();

  for (const skill of skills) {
    const matchingTech = selectedTechnologies.find((t) =>
      skill.technologies.includes(t),
    );
    const key = matchingTech ?? "other";
    const group = grouped.get(key) ?? [];
    group.push(skill);
    grouped.set(key, group);
  }

  return (
    <div className="space-y-8">
      {selectedTechnologies.map((techId) => {
        const group = grouped.get(techId);
        if (!group || group.length === 0) return null;

        return (
          <section key={techId}>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {techMap.get(techId) ?? techId}
              <span className="ml-2 text-xs font-normal">
                ({group.length})
              </span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((skill) => (
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
        );
      })}
    </div>
  );
}
