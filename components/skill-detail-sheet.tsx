"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { LabeledSection } from "@/components/labeled-section";
import { MarkdownContent } from "@/components/markdown-content";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  createSheetHandle,
} from "@/components/ui/cubby-ui/sheet";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  PlusSignIcon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/cubby-ui/button";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton/skeleton";
import {
  useBundleActions,
  useIsSkillSelected,
} from "@/lib/bundle-selection";
import { formatInstalls } from "@/lib/utils";
import type { SkillData } from "@/components/skill-card";

export type SkillDetailHandle = ReturnType<typeof createSheetHandle<SkillData>>;

export function createSkillDetailHandle() {
  return createSheetHandle<SkillData>();
}

interface SkillDetailSheetProps {
  handle: SkillDetailHandle;
}

export function SkillDetailSheet({ handle }: SkillDetailSheetProps) {
  return (
    <Sheet handle={handle}>
      {({ payload: skill }) => (
        <SheetContent side="right" variant="floating" className="sm:max-w-lg">
          {skill && <SkillDetailSheetContent skill={skill} handle={handle} />}
        </SheetContent>
      )}
    </Sheet>
  );
}

function SkillDetailSheetContent({
  skill,
  handle,
}: {
  skill: SkillData;
  handle: SkillDetailHandle;
}) {
  const { data: contentData, isPending: contentLoading } = useQuery(
    convexQuery(api.skills.getContent, {
      source: skill.source,
      skillId: skill.skillId,
    }),
  );
  const content = contentData?.content ?? null;
  const baseUrl = contentData?.skillMdUrl ?? null;

  const isSelected = useIsSkillSelected(skill.source, skill.skillId);
  const { toggleSkill } = useBundleActions();

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display">{skill.name}</SheetTitle>
        <SheetDescription>
          <span className="tabular-nums">
            {formatInstalls(skill.installs)} installs
          </span>
          {" · "}
          <a
            href={`https://github.com/${skill.source}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {skill.source}
          </a>
        </SheetDescription>
      </SheetHeader>
      <SheetBody>
        {contentLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : content || skill.description ? (
          <div className="space-y-8">
            {skill.description && (
              <LabeledSection label="Overview">
                <p className="text-base leading-relaxed text-pretty text-muted-foreground">
                  {skill.description}
                </p>
              </LabeledSection>
            )}
            {content && (
              <LabeledSection label="Documentation">
                <MarkdownContent baseUrl={baseUrl}>{content}</MarkdownContent>
              </LabeledSection>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No detailed content available for this skill.
          </p>
        )}
      </SheetBody>
      <SheetFooter>
        <Link
          href={`/${skill.source}/${skill.skillId}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
          onNavigate={() => handle.close()}
        >
          View full page
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="size-3.5"
          />
        </Link>
        <Button
          variant={isSelected ? "outline" : "primary"}
          size="sm"
          leftSection={
            <HugeiconsIcon
              icon={isSelected ? MinusSignIcon : PlusSignIcon}
              strokeWidth={2}
              className="size-3.5"
            />
          }
          onClick={() =>
            toggleSkill({
              source: skill.source,
              skillId: skill.skillId,
              name: skill.name,
            })
          }
        >
          {isSelected ? "Remove from bundle" : "Add to bundle"}
        </Button>
      </SheetFooter>
    </>
  );
}
