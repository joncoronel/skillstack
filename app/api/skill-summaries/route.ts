import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { cacheLife } from "next/cache";
import type { PaginationResult } from "convex/server";
import { api } from "@/convex/_generated/api";
import MiniSearch from "minisearch";

async function getSkillSearchIndex() {
  "use cache";
  cacheLife("days");

  const skills: Array<Record<string, unknown>> = [];
  let cursor: string | null = null;
  let isDone = false;

  while (!isDone) {
    const page = (await fetchQuery(api.skills.listAllSkillSummaries, {
      paginationOpts: { numItems: 8000, cursor },
    })) as PaginationResult<Record<string, unknown>>;
    skills.push(...page.page);
    isDone = page.isDone;
    cursor = page.continueCursor;
  }

  const miniSearch = new MiniSearch({
    fields: ["name"],
    storeFields: [
      "source",
      "skillId",
      "name",
      "description",
      "installs",
      "technologies",
    ],
  });

  miniSearch.addAll(skills.map((s, i) => ({ ...s, id: i })));

  return JSON.parse(JSON.stringify(miniSearch)) as Record<string, unknown>;
}

export async function GET() {
  const data = await getSkillSearchIndex();
  return NextResponse.json(data);
}
