"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BundleCard } from "@/components/bundle-card";
import { Button } from "@/components/ui/cubby-ui/button";

type SortMode = "recent" | "popular";

interface ExploreContentProps {
  preloadedBundles: Preloaded<typeof api.bundles.listPublic>;
}

export function ExploreContent({ preloadedBundles }: ExploreContentProps) {
  const bundles = usePreloadedQuery(preloadedBundles);
  const [sort, setSort] = useState<SortMode>("recent");

  const sorted = useMemo(() => {
    if (sort === "popular") {
      return [...bundles].sort((a, b) => b.skillCount - a.skillCount);
    }
    return bundles;
  }, [bundles, sort]);

  return (
    <>
      <div className="mb-6 flex gap-1">
        <Button
          variant={sort === "recent" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setSort("recent")}
        >
          Recent
        </Button>
        <Button
          variant={sort === "popular" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setSort("popular")}
        >
          Popular
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="py-20 text-center">
          <h2 className="text-lg font-semibold">No bundles yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to create and share a skill bundle.
          </p>
          <Button
            variant="primary"
            className="mt-6"
            nativeButton={false}
            render={<Link href="/" />}
          >
            Create a bundle
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((bundle) => (
            <BundleCard
              key={bundle._id}
              name={bundle.name}
              slug={bundle.slug}
              skillCount={bundle.skillCount}
              createdAt={bundle.createdAt}
              creatorName={bundle.creatorName}
              technologies={bundle.technologies}
            />
          ))}
        </div>
      )}
    </>
  );
}
