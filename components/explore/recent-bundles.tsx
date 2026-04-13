"use client";

import { useEffect, useRef, useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BundleCard, BundleCardSkeleton } from "@/components/bundle-card";

export function RecentBundles() {
  const [animOffset, setAnimOffset] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.bundles.listPublicPaginated,
    {},
    { initialNumItems: 20 },
  );

  const canLoadMore = status === "CanLoadMore";

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && canLoadMore) {
          setAnimOffset(results.length);
          loadMore(12);
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [canLoadMore, results.length, loadMore]);

  return (
    <section>
      <h2 className="mb-5 font-display text-lg font-semibold tracking-tight">
        Recent
      </h2>

      {status === "LoadingFirstPage" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BundleCardSkeleton key={i} hasStats />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No bundles yet. Be the first to create one!
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((bundle, i) => (
            <div
              key={bundle._id}
              // className="animate-in fade-in slide-in-from-bottom-2 fill-mode-[both]"
              // style={{
              //   animationDelay: `${Math.max(0, i - animOffset) * 30}ms`,
              //   animationDuration: "150ms",
              // }}
            >
              <BundleCard
                name={bundle.name}
                urlId={bundle.urlId}
                skillCount={bundle.skillCount}
                createdAt={bundle.createdAt}
                creatorName={bundle.creatorName}
                viewCount={bundle.viewCount}
              />
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      {status === "LoadingMore" && (
        <div className="mt-4 flex justify-center">
          <span className="text-xs text-muted-foreground">Loading more…</span>
        </div>
      )}
    </section>
  );
}
