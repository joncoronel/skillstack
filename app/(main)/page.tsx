"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { SkillExplorer } from "@/components/skill-explorer";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/cubby-ui/collapsible";

export default function Home() {
  const [searchActive, setSearchActive] = useState(false);

  const handleSearchActiveChange = useCallback((active: boolean) => {
    setSearchActive(active);
  }, []);

  return (
    <>
      {/* Hero */}
      <Collapsible open={!searchActive}>
        <CollapsibleContent className="max-sm:duration-0">
          <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Build your AI skill stack
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Discover, compare, and bundle skills for AI coding assistants like
              Cursor and Claude. Pick your technologies, find the best skills,
              and share your stack.
            </p>
          </section>
        </CollapsibleContent>
      </Collapsible>

      {/* Main content */}
      <main className={cn("mx-auto max-w-5xl px-4 pb-20 transition-[padding-top] duration-200 max-sm:duration-0 ease-out-cubic", searchActive ? "pt-6" : "pt-0")}>
        <SkillExplorer onSearchActiveChange={handleSearchActiveChange} />
      </main>
    </>
  );
}
