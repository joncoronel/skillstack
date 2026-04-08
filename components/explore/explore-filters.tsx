"use client";

import { useRef, useState } from "react";
import { useQueryState } from "nuqs";
import { exploreQueryParser } from "@/lib/search-params";
import { Input } from "@/components/ui/cubby-ui/input";
import { cn } from "@/lib/utils";

interface ExploreFiltersProps {
  className?: string;
}

export function ExploreFilters({ className }: ExploreFiltersProps) {
  const [urlQuery, setUrlQuery] = useQueryState("q", exploreQueryParser);
  // Local state drives the input for immediate typing feedback.
  // URL state is updated debounced so SearchResults only re-queries on pause.
  const [localValue, setLocalValue] = useState(urlQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const handleChange = (value: string) => {
    setLocalValue(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Clearing the input fires immediately; typing is debounced.
    if (value === "") {
      setUrlQuery(null);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      setUrlQuery(value);
    }, 300);
  };

  return (
    <section className={cn("mb-10", className)}>
      <Input
        placeholder="Search bundles..."
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className="max-w-xs"
      />
    </section>
  );
}
