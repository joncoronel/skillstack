import { Suspense } from "react";
import type { SearchParams } from "nuqs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { loadExploreSearchParams } from "@/lib/search-params.server";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { ExploreContent } from "./explore-content";

type ExplorePageProps = {
  searchParams: Promise<SearchParams>;
};

export default function ExplorePage({ searchParams }: ExplorePageProps) {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Explore
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Discover trending skills, popular bundles, and what the community is
          building.
        </p>
      </div>

      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ExploreLoader({ searchParams }: ExplorePageProps) {
  await loadExploreSearchParams(searchParams);
  const preloadedTrending = await preloadQuery(
    api.bundleEvents.getTrendingBundles,
    { limit: 6 },
  );
  return <ExploreContent preloadedTrending={preloadedTrending} />;
}

function ExploreSkeleton() {
  return (
    <>
      <section className="mb-10">
        <Skeleton className="mb-4 h-9 w-64 rounded-md" />
      </section>
      <section>
        <Skeleton className="mb-4 h-4 w-36" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </section>
    </>
  );
}
