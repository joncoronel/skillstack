"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/app-header";
import { BundleCard } from "@/components/bundle-card";
import { Button } from "@/components/ui/cubby-ui/button";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";

type SortMode = "recent" | "popular";

export default function ExplorePage() {
  const bundles = useQuery(api.bundles.listPublic, { limit: 30 });
  const [sort, setSort] = useState<SortMode>("recent");

  const sorted = useMemo(() => {
    if (!bundles) return undefined;
    if (sort === "popular") {
      return [...bundles].sort((a, b) => b.skillCount - a.skillCount);
    }
    return bundles;
  }, [bundles, sort]);

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Explore community bundles
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Discover skill bundles shared by the community.
          </p>
        </div>

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

        {sorted === undefined ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
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
      </main>
    </div>
  );
}
