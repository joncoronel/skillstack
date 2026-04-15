"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { FunctionReturnType } from "convex/server";
import { cn } from "@/lib/utils";
import { SkillExplorer } from "@/components/skill-explorer";
import { useCollapsibleHeight } from "@/hooks/cubby-ui/use-collapsible-height";
import { useUserPlan } from "@/hooks/use-user-plan";
import type { api } from "@/convex/_generated/api";

type HomeContentProps = {
  children: ReactNode;
  initialPopularSkills: FunctionReturnType<
    typeof api.skills.listPopularSkills
  >;
};

export function HomeContent({
  children,
  initialPopularSkills,
}: HomeContentProps) {
  const { limits } = useUserPlan();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? "text";
  const query = searchParams.get("q") ?? "";
  const repoUrl = searchParams.get("repo") ?? "";
  const searchActive =
    mode === "text"
      ? query.trim().length > 0
      : repoUrl.trim().length > 0;
  const { ref, height } = useCollapsibleHeight();

  return (
    <>
      {/* Hero — server-rendered children, collapse activates after hydration.
          Height transition lasts 200ms; the inner opacity fade runs shorter
          (150ms) so the tagline dims before the section shrinks, avoiding an
          abrupt disappearance. */}
      <div
        className="max-sm:duration-0 max-sm:transition-none transition-[height] duration-200 ease-out-cubic overflow-hidden"
        style={{ height: searchActive ? 0 : height }}
      >
        <div
          ref={ref}
          className={cn(
            "max-sm:duration-0 max-sm:transition-none transition-opacity duration-150 ease-out-cubic",
            searchActive ? "opacity-0" : "opacity-100",
          )}
        >
          {children}
        </div>
      </div>

      {/* Main content — renders immediately with cached data */}
      <main
        className={cn(
          "mx-auto max-w-5xl px-4 pb-20 transition-[padding-top] duration-200 max-sm:duration-0 ease-out-cubic",
          searchActive ? "pt-6" : "pt-0",
        )}
      >
        <SkillExplorer
          canAutoDetect={limits?.canAutoDetect ?? true}
          initialPopularSkills={initialPopularSkills}
        />
      </main>
    </>
  );
}
