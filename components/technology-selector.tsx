"use client";

import { Toggle } from "@/components/ui/cubby-ui/toggle";
import { TECHNOLOGIES, TECHNOLOGY_CATEGORIES } from "@/lib/technologies";
import { cn } from "@/lib/utils";

interface TechnologySelectorProps {
  selected: string[];
  onToggle: (id: string) => void;
}

const grouped = TECHNOLOGY_CATEGORIES.map((category) => ({
  category,
  technologies: TECHNOLOGIES.filter((t) => t.category === category),
}));

export function TechnologySelector({
  selected,
  onToggle,
}: TechnologySelectorProps) {
  return (
    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {grouped.map(({ category, technologies }) => {
        const selectedInCategory = technologies.filter((t) =>
          selected.includes(t.id),
        ).length;

        return (
          <div key={category}>
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {category}
              {selectedInCategory > 0 && (
                <span className="ml-1.5 text-primary">
                  · {selectedInCategory}
                </span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech) => {
                const isSelected = selected.includes(tech.id);
                return (
                  <Toggle
                    key={tech.id}
                    variant="outline"
                    size="sm"
                    pressed={isSelected}
                    onPressedChange={() => onToggle(tech.id)}
                    className={cn(
                      "rounded-full px-4 text-sm",
                      isSelected &&
                        "bg-primary/10 border-primary/40 text-primary data-[pressed]:bg-primary/15 data-[pressed]:text-primary",
                    )}
                  >
                    {tech.name}
                  </Toggle>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
