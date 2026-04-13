"use client";

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/cubby-ui/badge";
import { BundleCard, BundleCardSkeleton } from "@/components/bundle-card";

export function TrendingBundles() {
  const { data: bundles, isPending } = useQuery({
    ...convexQuery(api.bundleEvents.getTrendingBundles, { limit: 6 }),
    gcTime: 5 * 60_000,
  });

  if (!isPending && (!bundles || bundles.length === 0)) return null;

  return (
    <section>
      <div className="mb-5 flex items-center gap-2.5">
        <Badge>Trending</Badge>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          What&rsquo;s hot right now
        </h2>
      </div>

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BundleCardSkeleton key={i} hasStats />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bundles!.map((bundle, i) => (
            <div
              key={bundle._id}
              // className="animate-in fade-in slide-in-from-bottom-2 fill-mode-[both] motion-reduce:animate-none"
              // style={{
              //   animationDelay: `${i * 50}ms`,
              //   animationDuration: "200ms",
              // }}
            >
              <BundleCard
                name={bundle.name}
                urlId={bundle.urlId}
                skillCount={bundle.skillCount}
                createdAt={bundle.createdAt}
                creatorName={bundle.creatorName}
                creatorImage={bundle.creatorImage}
                viewCount={bundle.viewCount}
                copyCount={bundle.copyCount}
                forkCount={bundle.forkCount}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
