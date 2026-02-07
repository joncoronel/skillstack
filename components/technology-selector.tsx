"use client";

import { Toggle } from "@/components/ui/cubby-ui/toggle";
import { TECHNOLOGIES } from "@/lib/technologies";
import { cn } from "@/lib/utils";

interface TechnologySelectorProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export function TechnologySelector({
  selected,
  onToggle,
}: TechnologySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TECHNOLOGIES.map((tech) => {
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
  );
}
