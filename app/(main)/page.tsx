import { cacheLife } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { HomeContent } from "./home-content";

// Cached separately — skills sync daily at 06:00 UTC so hour-scale staleness is fine.
async function getInitialPopularSkills() {
  "use cache";
  cacheLife("hours");
  return fetchQuery(api.skills.listPopularSkills, {
    paginationOpts: { numItems: 30, cursor: null },
  });
}

export default async function Home() {
  const initialPopularSkills = await getInitialPopularSkills();

  return (
    <HomeContent initialPopularSkills={initialPopularSkills}>
      <section className="mx-auto max-w-5xl px-4 pt-20 pb-14">
        <h1 className="font-display text-5xl font-bold tracking-tighter leading-[0.85] sm:text-7xl lg:text-8xl">
          Build your
          <br />
          <span className="text-primary">AI skill stack</span>
        </h1>
        <p className="mt-6 max-w-lg text-muted-foreground sm:text-lg sm:leading-relaxed">
          Discover, compare, and bundle skills for AI coding assistants like
          Cursor and Claude. Pick your stack, share with a link.
        </p>
      </section>
    </HomeContent>
  );
}
