"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MiniSearch, { type SearchResult } from "minisearch";
import { SearchIcon, XIcon, LoaderIcon } from "lucide-react";
import { Input } from "@/components/ui/cubby-ui/input";
import { SkillCard } from "@/components/skill-card";
import { SkillDetailSheet } from "@/components/skill-detail-sheet";

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

type SkillResult = SearchResult & {
  source: string;
  skillId: string;
  name: string;
  description?: string;
  installs: number;
  technologies: string[];
};

export function SkillSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeSkill, setActiveSkill] = useState<SkillResult | null>(null);
  const [searchIndex, setSearchIndex] = useState<MiniSearch | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query by 300ms
  useEffect(() => {
    const trimmed = query.trim();
    const id = setTimeout(() => setDebouncedQuery(trimmed), trimmed ? 0 : 0);
    return () => clearTimeout(id);
  }, [query]);

  // Lazy-load search index on first focus
  const handleFocus = useCallback(() => {
    if (searchIndex || indexLoading) return;
    setIndexLoading(true);
    fetch("/api/skill-summaries")
      .then((r) => r.json())
      .then((data) => {
        const index = MiniSearch.loadJSON(
          JSON.stringify(data),
          MINISEARCH_OPTIONS,
        );
        setSearchIndex(index);
      })
      .finally(() => setIndexLoading(false));
  }, [searchIndex, indexLoading]);

  // Search locally
  const results =
    debouncedQuery && searchIndex
      ? (searchIndex
          .search(debouncedQuery, { fuzzy: 0.2, prefix: true })
          .sort(
            (a, b) =>
              ((b as SkillResult).installs ?? 0) -
              ((a as SkillResult).installs ?? 0),
          )
          .slice(0, 50) as SkillResult[])
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
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Search skills by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          className="pl-9 pr-9"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        ) : isLoading ? (
          <LoaderIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        ) : null}
      </div>

      {query.trim() && (
        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Loading search index…
            </p>
          ) : results.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                {results.length} result{results.length !== 1 && "s"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((skill) => (
                  <SkillCard
                    key={`${skill.source}/${skill.skillId}`}
                    name={skill.name}
                    source={skill.source}
                    skillId={skill.skillId}
                    description={skill.description}
                    installs={skill.installs}
                    technologies={skill.technologies}
                    selectable
                    onViewDetail={() => setActiveSkill(skill)}
                  />
                ))}
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
