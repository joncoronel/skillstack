"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/cubby-ui/select";

export type SortBy = "newest" | "most-viewed" | "most-copied" | "alphabetical";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "most-viewed", label: "Most viewed" },
  { value: "most-copied", label: "Most copied" },
  { value: "alphabetical", label: "A–Z" },
];

interface BundleSectionHeaderProps {
  count: number;
  sortBy: SortBy;
  onSortChange: (value: SortBy) => void;
}

export function BundleSectionHeader({
  count,
  sortBy,
  onSortChange,
}: BundleSectionHeaderProps) {
  const countStr = count.toString().padStart(2, "0");

  return (
    <div className="flex items-center justify-between border-b pb-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Bundles <span aria-hidden>&middot;</span>{" "}
        <span className="text-foreground tabular-nums">{countStr}</span>
      </p>
      <div className="flex items-center gap-2">
        <label
          htmlFor="bundle-sort"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Sort
        </label>
        <Select
          items={SORT_OPTIONS}
          value={sortBy}
          onValueChange={(value) => {
            if (value) onSortChange(value as SortBy);
          }}
        >
          <SelectTrigger
            id="bundle-sort"
            size="sm"
            className="w-auto min-w-36 border-transparent bg-transparent shadow-none before:hidden dark:bg-transparent"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent size="sm" alignItemWithTrigger>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
