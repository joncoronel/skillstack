import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import type { PaginationResult } from "convex/server";
import { api } from "@/convex/_generated/api";
import MiniSearch from "minisearch";

export const dynamic = "force-static";
export const revalidate = 86400; // 24 hours

export async function GET() {
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

  return NextResponse.json(JSON.parse(JSON.stringify(miniSearch)));
}
