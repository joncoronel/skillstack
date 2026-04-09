"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryState } from "nuqs";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  GithubIcon,
  FlashIcon,
} from "@hugeicons/core-free-icons";
import {
  modeParser,
  searchQueryParser,
  repoUrlParser,
  type ModeValue,
} from "@/lib/search-params";
import { BundleSelectionProvider } from "@/lib/bundle-selection-context";
import { Input } from "@/components/ui/cubby-ui/input";
import { Button } from "@/components/ui/cubby-ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsPanels,
  TabsContent,
} from "@/components/ui/cubby-ui/tabs";
import { SkillSearchResults } from "@/components/skill-search";
import { RepoAnalysisResults } from "@/components/repo-url-input";
import { BundleBar } from "@/components/bundle-bar";

interface SkillExplorerProps {
  canAutoDetect: boolean;
}

const TEXT_DEBOUNCE_MS = 300;

export function SkillExplorer({ canAutoDetect }: SkillExplorerProps) {
  const [mode, setMode] = useQueryState("mode", modeParser);
  const [textQuery, setTextQuery] = useQueryState("q", searchQueryParser);
  const [repoUrl, setRepoUrl] = useQueryState("repo", repoUrlParser);

  const [debouncedText, setDebouncedText] = useState(textQuery.trim());
  const [repoTriggerKey, setRepoTriggerKey] = useState(repoUrl ? 1 : 0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce text query (300ms) — only for non-empty values. An empty input
  // is read directly from `textQuery` below so clearing the field wipes
  // results instantly instead of lingering for 300ms.
  useEffect(() => {
    const trimmed = textQuery.trim();
    if (!trimmed) return;
    const id = setTimeout(() => setDebouncedText(trimmed), TEXT_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [textQuery]);

  const effectiveTextQuery = textQuery.trim() ? debouncedText : "";

  // Keyboard shortcut: focus on /
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleRepoSubmit() {
    const trimmed = repoUrl.trim();
    if (!trimmed) return;
    setRepoTriggerKey((k) => k + 1);
  }

  const isText = mode === "text";
  const inputValue = isText ? textQuery : repoUrl;
  const placeholder = isText
    ? "Search skills by name…"
    : "https://github.com/owner/repo";
  const Icon = isText ? Search01Icon : GithubIcon;

  return (
    <BundleSelectionProvider>
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as ModeValue)}
      >
        <TabsList variant="underline" className="mb-3">
          <TabsTrigger value="text">
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
            Text
          </TabsTrigger>
          <TabsTrigger value="repo">
            <HugeiconsIcon
              icon={GithubIcon}
              strokeWidth={2}
              className="size-3.5"
            />
            Repo
          </TabsTrigger>
        </TabsList>

        {/* Unified input — lives inside Tabs root but outside TabsPanels so
            it doesn't animate on mode change. State (mode) drives which
            input/placeholder/icon renders. */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <HugeiconsIcon
              icon={Icon}
              strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => {
                if (isText) {
                  setTextQuery(e.target.value);
                  // Reset debounced value when clearing so the next keystroke
                  // doesn't briefly resurface stale results.
                  if (!e.target.value.trim()) setDebouncedText("");
                } else {
                  setRepoUrl(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (!isText && e.key === "Enter") handleRepoSubmit();
              }}
              className="pl-9 pr-9"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => {
                  if (isText) {
                    setTextQuery("");
                    setDebouncedText("");
                  } else {
                    setRepoUrl("");
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </button>
            )}
          </div>
          {!isText && (
            <Button
              variant="outline"
              onClick={handleRepoSubmit}
              disabled={!repoUrl.trim() || !canAutoDetect}
              leftSection={
                <HugeiconsIcon
                  icon={FlashIcon}
                  strokeWidth={2}
                  className="size-3.5"
                />
              }
            >
              Analyze
            </Button>
          )}
        </div>

        {/* Results region — each panel keeps mounted so per-mode state
            (search results, repo analysis) survives mode switches. */}
        <TabsPanels>
          <TabsContent value="text" keepMounted>
            <SkillSearchResults query={effectiveTextQuery} />
          </TabsContent>
          <TabsContent value="repo" keepMounted>
            <RepoAnalysisResults
              repoUrl={repoUrl}
              triggerKey={repoTriggerKey}
              canAutoDetect={canAutoDetect}
            />
          </TabsContent>
        </TabsPanels>
      </Tabs>

      <BundleBar />
    </BundleSelectionProvider>
  );
}
