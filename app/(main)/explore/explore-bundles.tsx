import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ExploreContent } from "./explore-content";

export async function ExploreBundles() {
  const preloadedBundles = await preloadQuery(api.bundles.listPublic, {
    limit: 30,
  });
  return <ExploreContent preloadedBundles={preloadedBundles} />;
}
