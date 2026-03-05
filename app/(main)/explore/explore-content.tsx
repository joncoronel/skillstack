"use client";

import { useMemo } from "react";
import { useQueryState } from "nuqs";
import Link from "next/link";
import { sortParser } from "@/lib/search-params";
import { BundleCard } from "@/components/bundle-card";
import { Button } from "@/components/ui/cubby-ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/cubby-ui/tabs";

interface PublicBundle {
  _id: string;
  name: string;
  urlId: string;
  skillCount: number;
  createdAt: number;
  creatorName: string;
  technologies: string[];
}

interface ExploreContentProps {
  bundles: PublicBundle[];
}

export function ExploreContent({ bundles }: ExploreContentProps) {
  const [sort, setSort] = useQueryState("sort", sortParser);

  const sorted = useMemo(() => {
    if (sort === "popular") {
      return [...bundles].sort((a, b) => b.skillCount - a.skillCount);
    }
    return bundles;
  }, [bundles, sort]);

  return (
    <Tabs
      value={sort}
      onValueChange={(value) => setSort(value as "recent" | "popular")}
    >
      <TabsList variant="underline" className="mb-6">
        <TabsTrigger value="recent">Recent</TabsTrigger>
        <TabsTrigger value="popular">Popular</TabsTrigger>
      </TabsList>

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
          {sorted.map((bundle, i) => (
            <div
              key={`${sort}-${bundle._id}`}
              className="animate-in fade-in slide-in-from-bottom-2 fill-mode-[both]"
              style={{
                animationDelay: `${i * 30}ms`,
                animationDuration: "150ms",
              }}
            >
              <BundleCard
                name={bundle.name}
                urlId={bundle.urlId}
                skillCount={bundle.skillCount}
                createdAt={bundle.createdAt}
                creatorName={bundle.creatorName}
                technologies={bundle.technologies}
              />
            </div>
          ))}
        </div>
      )}
    </Tabs>
  );
}
