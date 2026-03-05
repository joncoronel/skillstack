import { cacheLife } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ExploreContent } from "./explore-content";

export async function ExploreBundles() {
  "use cache";
  cacheLife("minutes");
  const bundles = await fetchQuery(api.bundles.listPublic, {
    limit: 30,
  });
  return <ExploreContent bundles={bundles} />;
}
