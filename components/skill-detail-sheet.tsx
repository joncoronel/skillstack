"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import Markdown from "react-markdown";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/cubby-ui/sheet";
import { Badge } from "@/components/ui/cubby-ui/badge";
import { Button } from "@/components/ui/cubby-ui/button";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { TECHNOLOGIES } from "@/lib/technologies";
import { useBundleSelection } from "@/lib/bundle-selection-context";

interface SkillInfo {
  source: string;
  skillId: string;
  name: string;
  description?: string;
  installs: number;
  technologies: string[];
}

interface SkillDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: SkillInfo | null;
}

const techMap = new Map(TECHNOLOGIES.map((t) => [t.id, t.name]));

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function SkillDetailSheet({
  open,
  onOpenChange,
  skill,
}: SkillDetailSheetProps) {
  // Keep the last non-null skill so content stays visible during exit animation
  const [displaySkill, setDisplaySkill] = useState<SkillInfo | null>(null);
  if (skill && skill !== displaySkill) {
    setDisplaySkill(skill);
  }
  const shownSkill = skill ?? displaySkill;

  const { data: content, isPending: contentLoading } = useQuery(
    convexQuery(
      api.skills.getContent,
      shownSkill
        ? { source: shownSkill.source, skillId: shownSkill.skillId }
        : "skip",
    ),
  );

  const selection = useBundleSelection();
  const isSelected =
    shownSkill && selection
      ? selection.isSelected(shownSkill.source, shownSkill.skillId)
      : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" variant="floating" className="sm:max-w-lg">
        {shownSkill && (
          <>
            <SheetHeader>
              <SheetTitle>{shownSkill.name}</SheetTitle>
              <SheetDescription>
                <span className="tabular-nums">
                  {formatInstalls(shownSkill.installs)} installs
                </span>
                {" · "}
                <a
                  href={`https://github.com/${shownSkill.source}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {shownSkill.source}
                </a>
              </SheetDescription>
              {shownSkill.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {shownSkill.technologies.map((techId) => (
                    <Badge
                      key={techId}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5"
                    >
                      {techMap.get(techId) ?? techId}
                    </Badge>
                  ))}
                </div>
              )}
            </SheetHeader>
            <SheetBody>
              {contentLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {shownSkill.description && (
                    <p className="lead text-muted-foreground">
                      {shownSkill.description}
                    </p>
                  )}
                  <Markdown>{content}</Markdown>
                </div>
              ) : shownSkill.description ? (
                <p className="text-sm text-muted-foreground">
                  {shownSkill.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No detailed content available for this skill.
                </p>
              )}
            </SheetBody>
            <SheetFooter>
              {selection && (
                <Button
                  variant={isSelected ? "outline" : "primary"}
                  size="sm"
                  onClick={() =>
                    selection.toggleSkill({
                      source: shownSkill.source,
                      skillId: shownSkill.skillId,
                      name: shownSkill.name,
                    })
                  }
                >
                  {isSelected ? "Remove from bundle" : "Add to bundle"}
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
