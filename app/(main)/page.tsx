import type { SearchParams } from "nuqs/server";
import { loadHomeSearchParams } from "@/lib/search-params.server";
import { HomeContent } from "./home-content";

type HomeProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Home({ searchParams }: HomeProps) {
  await loadHomeSearchParams(searchParams);
  return <HomeContent />;
}
