"use client";

import { useId } from "react";
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
import { Label } from "@/components/ui/cubby-ui/label";
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
  onViewDetail?: () => void;
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
  onViewDetail,
}: SkillCardProps) {
  const techMap = new Map(TECHNOLOGIES.map((t) => [t.id, t.name]));
  const id = useId();
  const checkboxId = `skill-${id}`;

  // Always call hook (rules of hooks) — returns null outside provider
  const selection = useBundleSelection();
  const selected =
    selectable && selection ? selection.isSelected(source, skillId) : false;

  const cardInner = (
    <>
      <CardHeader className="gap-1">
        <div className="flex items-center gap-2">
          {selectable && (
            <Checkbox
              id={checkboxId}
              checked={selected}
              onCheckedChange={() => {
                if (selection) selection.toggleSkill({ source, skillId, name });
              }}
              className="shrink-0"
            />
          )}
          <CardTitle className="text-sm leading-snug [text-box:trim-both_cap_alphabetic]">
            {onViewDetail ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onViewDetail();
                }}
                className="hover:underline text-left"
              >
                {name}
              </button>
            ) : (
              name
            )}
          </CardTitle>
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
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                +{technologies.length - 4}
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </>
  );

  if (selectable) {
    return (
      <Label
        htmlFor={checkboxId}
        data-variant="default"
        className={cn(
          "text-card-foreground flex flex-col bg-card gap-3 rounded-2xl border dark:border-border/50 py-4",
          "cursor-pointer transition-colors",
          "has-data-checked:border-primary/40 has-data-checked:bg-primary/5",
          "hover:bg-muted/50"
        )}
      >
        {cardInner}
      </Label>
    );
  }

  return <Card className="gap-3 py-4">{cardInner}</Card>;
}
