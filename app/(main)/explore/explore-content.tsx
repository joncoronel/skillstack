"use client";

import { ExploreFilters } from "@/components/explore/explore-filters";
import { TrendingBundles } from "@/components/explore/trending-bundles";
import { RecentBundles } from "@/components/explore/recent-bundles";

export function ExploreContent() {
  return (
    <>
      <ExploreFilters />
      <TrendingBundles />
      <RecentBundles />
    </>
  );
}
