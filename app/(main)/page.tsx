import { cacheLife } from "next/cache";
import type { SearchParams } from "nuqs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { loadHomeSearchParams } from "@/lib/search-params.server";
import { HomeContent } from "./home-content";

type HomeProps = {
  searchParams: Promise<SearchParams>;
};

// Cached separately so the dynamic searchParams access in Home doesn't
// prevent the popular-skills fetch from being reused across requests.
// Skills sync daily at 06:00 UTC so hour-scale staleness is fine.
async function getInitialPopularSkills() {
  "use cache";
  cacheLife("hours");
  return fetchQuery(api.skills.listPopularSkills, {
    paginationOpts: { numItems: 30, cursor: null },
  });
}

export default async function Home({ searchParams }: HomeProps) {
  // loadHomeSearchParams must run before getInitialPopularSkills — it accesses
  // searchParams, which unlocks Math.random() for cacheComponents.
  await loadHomeSearchParams(searchParams);
  const initialPopularSkills = await getInitialPopularSkills();
  return <HomeContent initialPopularSkills={initialPopularSkills} />;
}
