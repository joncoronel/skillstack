"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { BundleSelectionProvider } from "@/lib/bundle-selection-context";
import { TechnologySelector } from "@/components/technology-selector";
import { RepoUrlInput } from "@/components/repo-url-input";
import { SkillResults } from "@/components/skill-results";
import { BundleBar } from "@/components/bundle-bar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/cubby-ui/collapsible";

export function SkillExplorer() {
  const [selected, setSelected] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(true);

  function handleToggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function handleRepoDetected(technologies: string[]) {
    setSelected(technologies);
  }

  return (
    <BundleSelectionProvider>
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          What&apos;s in your stack?
        </h2>
        <RepoUrlInput onTechnologiesDetected={handleRepoDetected} />
        <Collapsible open={pickerOpen} onOpenChange={setPickerOpen}>
          <div className="relative mt-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <CollapsibleTrigger className="w-auto border-none bg-transparent shadow-none ring-0 py-0 hover:bg-transparent hover:opacity-80 gap-1.5">
                <span className="bg-background px-2 text-muted-foreground">
                  or select manually
                  {!pickerOpen && selected.length > 0 && (
                    <span className="ml-1 text-primary">
                      ({selected.length})
                    </span>
                  )}
                </span>
                <span className="bg-background pr-1">
                  <ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform duration-200 group-data-[panel-open]/collapsible:rotate-180" />
                </span>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent>
            <div className="mt-5 pb-1">
              <TechnologySelector
                selected={selected}
                onToggle={handleToggle}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>

      <section className="mt-10">
        <SkillResults selectedTechnologies={selected} />
      </section>

      <BundleBar />
    </BundleSelectionProvider>
  );
}
