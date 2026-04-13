"use client";

import { useQueryState } from "nuqs";
import { exploreQueryParser } from "@/lib/search-params";
import { Input } from "@/components/ui/cubby-ui/input";
import { cn } from "@/lib/utils";

interface ExploreFiltersProps {
  className?: string;
}

export function ExploreFilters({ className }: ExploreFiltersProps) {
  const [query, setQuery] = useQueryState("q", exploreQueryParser);

  return (
    <section className={cn("mb-10", className)}>
      <Input
        placeholder="Search bundles..."
        value={query}
        onChange={(e) => setQuery(e.target.value || null)}
        className="max-w-xs"
      />
    </section>
  );
}
