"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import Fuse from "fuse.js";
import { SearchIcon, XIcon, LoaderIcon } from "lucide-react";
import { Input } from "@/components/ui/cubby-ui/input";
import { SkillCard } from "@/components/skill-card";
import { SkillDetailSheet } from "@/components/skill-detail-sheet";

const MAX_RESULTS = 20;

interface SkillSummary {
  _id: string;
  source: string;
  skillId: string;
  name: string;
  description?: string;
  installs: number;
  technologies: string[];
}

export function SkillSearch() {
  const [query, setQuery] = useState("");
  const [activeSkill, setActiveSkill] = useState<SkillSummary | null>(null);
  const [searchActivated, setSearchActivated] = useState(false);
  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch skill summaries from cached Route Handler on first focus
  useEffect(() => {
    if (!searchActivated) return;
    let cancelled = false;
    fetch("/api/skill-summaries")
      .then((res) => res.json())
      .then((data: SkillSummary[]) => {
        if (!cancelled) setSkills(data);
      });
    return () => {
      cancelled = true;
    };
  }, [searchActivated]);

  const fuse = useMemo(() => {
    if (!skills) return null;
    return new Fuse(skills, {
      keys: ["name"],
      threshold: 0.3,
      includeScore: true,
    });
  }, [skills]);

  const results = useMemo(() => {
    if (!query.trim() || !fuse) return [];
    return fuse.search(query.trim(), { limit: MAX_RESULTS }).map((r) => r.item);
  }, [fuse, query]);

  const handleFocus = useCallback(() => {
    if (!searchActivated) setSearchActivated(true);
  }, [searchActivated]);

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

  const isLoading = searchActivated && skills === null;

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
              Loading skills…
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
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No skills found for &ldquo;{query}&rdquo;
            </p>
          )}
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
