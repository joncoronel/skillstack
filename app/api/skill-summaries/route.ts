import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import MiniSearch from "minisearch";

export const dynamic = "force-static";
export const revalidate = 86400; // 24 hours

export async function GET() {
  const skills = await fetchQuery(api.skills.listAllSkillSummaries);

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
