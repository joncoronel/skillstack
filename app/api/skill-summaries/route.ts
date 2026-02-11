import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-static";
export const revalidate = 86400; // 24 hours

export async function GET() {
  const data = await fetchQuery(api.skills.listAllSkillSummaries);
  return NextResponse.json(data);
}
