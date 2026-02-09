"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/cubby-ui/card";
import { Badge } from "@/components/ui/cubby-ui/badge";
import { Checkbox } from "@/components/ui/cubby-ui/checkbox";
import { TECHNOLOGIES } from "@/lib/technologies";
import { useBundleSelection } from "@/lib/bundle-selection-context";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  name: string;
  source: string;
  skillId: string;
  description?: string;
  installs: number;
  technologies: string[];
  selectable?: boolean;
}

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function SkillCard({
  name,
  source,
  skillId,
  description,
  installs,
  technologies,
  selectable = false,
}: SkillCardProps) {
  const techMap = new Map(TECHNOLOGIES.map((t) => [t.id, t.name]));

  // Always call hook (rules of hooks) — returns null outside provider
  const selection = useBundleSelection();
  const selected = selectable && selection ? selection.isSelected(source, skillId) : false;

  function handleClick() {
    if (!selectable || !selection) return;
    selection.toggleSkill({ source, skillId, name });
  }

  return (
    <Card
      className={cn(
        "gap-3 py-4 transition-colors",
        selectable && "cursor-pointer",
        selected && "border-primary/40 bg-primary/5",
      )}
      onClick={handleClick}
    >
      <CardHeader className="gap-1">
        <div className="flex items-start gap-2">
          {selectable && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => handleClick()}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 shrink-0"
            />
          )}
          <CardTitle className="text-sm leading-snug">{name}</CardTitle>
        </div>
        <CardAction>
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatInstalls(installs)} installs
          </span>
        </CardAction>
        <CardDescription className="text-xs line-clamp-2">
          {description ?? source}
        </CardDescription>
      </CardHeader>
      {technologies.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {technologies.slice(0, 4).map((techId) => (
              <Badge
                key={techId}
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5"
              >
                {techMap.get(techId) ?? techId}
              </Badge>
            ))}
            {technologies.length > 4 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0.5"
              >
                +{technologies.length - 4}
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
