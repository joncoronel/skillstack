"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryState } from "nuqs";
import MiniSearch, { type SearchResult } from "minisearch";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Cancel01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { searchQueryParser } from "@/lib/search-params";
import { Input } from "@/components/ui/cubby-ui/input";
import { SkillCard } from "@/components/skill-card";
import { SkillDetailSheet } from "@/components/skill-detail-sheet";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { cn } from "@/lib/utils";

const MINISEARCH_OPTIONS = {
  fields: ["name"],
  storeFields: [
    "source",
    "skillId",
    "name",
    "description",
    "installs",
    "technologies",
  ],
};

function fetchSearchIndex(): Promise<MiniSearch> {
  return fetch("/api/skill-summaries")
    .then((r) => r.json())
    .then((data) =>
      MiniSearch.loadJSON(JSON.stringify(data), MINISEARCH_OPTIONS),
    );
}

type SkillResult = SearchResult & {
  source: string;
  skillId: string;
  name: string;
  description?: string;
  installs: number;
  technologies: string[];
};

export function SkillSearch() {
  const [query, setQuery] = useQueryState("q", searchQueryParser);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeSkill, setActiveSkill] = useState<SkillResult | null>(null);
  const [searchIndex, setSearchIndex] = useState<MiniSearch | null>(null);
  const [indexLoading, setIndexLoading] = useState(
    () => query.trim().length > 0,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query by 300ms
  useEffect(() => {
    const trimmed = query.trim();
    const id = setTimeout(() => setDebouncedQuery(trimmed), trimmed ? 0 : 0);
    return () => clearTimeout(id);
  }, [query]);

  // Load search index on focus
  const loadIndex = useCallback(() => {
    if (searchIndex || indexLoading) return;
    setIndexLoading(true);
    fetchSearchIndex()
      .then(setSearchIndex)
      .finally(() => setIndexLoading(false));
  }, [searchIndex, indexLoading]);

  // Eagerly load index if page loads with a query already in the URL
  useEffect(() => {
    if (!query.trim()) return;
    fetchSearchIndex()
      .then(setSearchIndex)
      .finally(() => setIndexLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Blend relevance with popularity (normalized weighted)
  // RELEVANCE_WEIGHT: 1 = pure relevance, 0 = pure popularity
  const RELEVANCE_WEIGHT = 0.4;
  const results =
    debouncedQuery && searchIndex
      ? (() => {
          const raw = searchIndex.search(debouncedQuery, {
            fuzzy: 0.3,
            prefix: true,
          }) as SkillResult[];
          if (raw.length === 0) return [];

          const maxScore = Math.max(...raw.map((r) => r.score));
          const maxPop = Math.max(
            ...raw.map((r) => Math.log10(1 + (r.installs ?? 0))),
          );

          return raw
            .sort((a, b) => {
              const aNorm = maxScore ? a.score / maxScore : 0;
              const bNorm = maxScore ? b.score / maxScore : 0;
              const aPop = maxPop
                ? Math.log10(1 + (a.installs ?? 0)) / maxPop
                : 0;
              const bPop = maxPop
                ? Math.log10(1 + (b.installs ?? 0)) / maxPop
                : 0;
              return (
                RELEVANCE_WEIGHT * bNorm +
                (1 - RELEVANCE_WEIGHT) * bPop -
                (RELEVANCE_WEIGHT * aNorm + (1 - RELEVANCE_WEIGHT) * aPop)
              );
            })
            .slice(0, 50);
        })()
      : [];

  const isLoading = indexLoading;

  // Keyboard shortcut: focus on / key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        // Don't focus the search input when the search tab is hidden
        const isVisible =
          inputRef.current && !inputRef.current.closest("[hidden]");
        if (!isVisible) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div>
      <div className="relative">
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Search skills by name…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onFocus={loadIndex}
          className="pl-9 pr-9"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
          </button>
        ) : isLoading ? (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        ) : null}
      </div>

      {query.trim() && (
        <div className="mt-4">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-20 mb-3" />
              <div className="grid">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 bg-card border dark:border-border/50",
                      i === 0 ? "rounded-t-2xl" : "border-t-0",
                      i === 15 ? "rounded-b-2xl" : "",
                    )}
                  >
                    <Skeleton className="size-4 rounded-sm shrink-0" />
                    <Skeleton className="h-5 w-28 rounded-sm" />
                    <Skeleton className="h-5 w-16 rounded-sm" />
                    <Skeleton className="ml-auto h-4 w-10 shrink-0 rounded-sm" />
                  </div>
                ))}
              </div>
            </>
          ) : results.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                {results.length} result{results.length !== 1 && "s"}
              </p>
              <div className="grid">
                {results.map((skill, i) => {
                  const isFirst = i === 0;
                  const isLast = i === results.length - 1;
                  const isSolo = results.length === 1;
                  return (
                    <SkillCard
                      key={`${skill.source}/${skill.skillId}`}
                      name={skill.name}
                      source={skill.source}
                      skillId={skill.skillId}
                      description={skill.description}
                      installs={skill.installs}
                      technologies={skill.technologies}
                      selectable
                      variant="row"
                      onViewDetail={() => setActiveSkill(skill)}
                      className={
                        isSolo
                          ? undefined
                          : isFirst
                            ? "rounded-b-none"
                            : isLast
                              ? "rounded-t-none border-t-0"
                              : "rounded-none border-t-0"
                      }
                    />
                  );
                })}
              </div>
            </>
          ) : debouncedQuery ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No skills found for &ldquo;{query}&rdquo;
            </p>
          ) : null}
        </div>
      )}

      <SkillDetailSheet
        open={activeSkill !== null}
        onOpenChange={(open) => {
          if (!open) setActiveSkill(null);
        }}
        skill={activeSkill}
      />
    </div>
  );
}
