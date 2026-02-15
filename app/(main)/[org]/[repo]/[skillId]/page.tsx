import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SkillPageContent } from "./skill-page-content";

export const dynamic = "force-static";
export const revalidate = 86400; // 24 hours

export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ org: string; repo: string; skillId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { org, repo, skillId } = await params;
  const source = `${org}/${repo}`;

  const skill = await fetchQuery(api.skills.getBySourceAndSkillId, {
    source,
    skillId,
  });

  if (!skill) {
    return { title: "Skill Not Found | SkillStack" };
  }

  const title = `${skill.name} | SkillStack`;
  const description =
    skill.description ?? `${skill.name} — a skill from ${source}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function SkillPage({ params }: { params: Params }) {
  const { org, repo, skillId } = await params;
  const source = `${org}/${repo}`;

  const skill = await fetchQuery(api.skills.getBySourceAndSkillId, {
    source,
    skillId,
  });

  if (!skill) {
    notFound();
  }

  return <SkillPageContent skill={skill} content={skill.content ?? null} />;
}
