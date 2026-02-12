"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { BundleSelectionProvider } from "@/lib/bundle-selection-context";
import { TechnologySelector } from "@/components/technology-selector";
import { RepoUrlInput } from "@/components/repo-url-input";
import { SkillResults } from "@/components/skill-results";
import { SkillSearch } from "@/components/skill-search";
import { BundleBar } from "@/components/bundle-bar";
import { StickyTechBar } from "@/components/sticky-tech-bar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/cubby-ui/tabs";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/cubby-ui/collapsible";

interface SkillExplorerProps {
  onSearchActiveChange?: (active: boolean) => void;
}

export function SkillExplorer({ onSearchActiveChange }: SkillExplorerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(true);
  const selectorRef = useRef<HTMLDivElement>(null);

  function handleToggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function handleRepoDetected(technologies: string[]) {
    setSelected(technologies);
  }

  function handleEditStack() {
    setPickerOpen(true);
    setTimeout(() => {
      selectorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  return (
    <BundleSelectionProvider>
      <Tabs defaultValue="browse">
        <TabsList variant="underline">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="browse">Browse by Stack</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6" keepMounted>
          <SkillSearch onSearchActiveChange={onSearchActiveChange} />
        </TabsContent>

        <TabsContent value="browse" className="mt-6" keepMounted>
          <div ref={selectorRef}>
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
          </div>

          <StickyTechBar
            selected={selected}
            onRemove={handleToggle}
            onEditClick={handleEditStack}
            selectorRef={selectorRef}
          />

          <section className="mt-10">
            <SkillResults selectedTechnologies={selected} />
          </section>
        </TabsContent>
      </Tabs>

      <BundleBar />
    </BundleSelectionProvider>
  );
}
