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
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Build your{" "}
          <mark className="bg-primary/10 text-primary rounded px-1">
            AI skill stack
          </mark>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Discover, compare, and bundle skills for AI coding assistants like
          Cursor and Claude. Pick your technologies, find the best skills, and
          share your stack.
        </p>
      </section>
    </HomeContent>
  );
}
