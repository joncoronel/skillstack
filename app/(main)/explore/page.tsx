import { Suspense } from "react";
import { ExploreContent } from "./explore-content";

export default function ExplorePage() {
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

      <Suspense>
        <ExploreContent />
      </Suspense>
    </main>
  );
}
