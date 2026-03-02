import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { SkillPageContent } from "./skill-page-content";

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

function SkillSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-48 mb-6" />
      <Skeleton className="h-9 w-80 mb-3" />
      <Skeleton className="h-4 w-56 mb-4" />
      <div className="flex gap-1.5 mb-8">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl mb-8" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </>
  );
}

async function SkillContent({ params }: { params: Params }) {
  "use cache";
  cacheLife({ revalidate: 86400, expire: 604800 });
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

export default function SkillPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      <Suspense fallback={<SkillSkeleton />}>
        <SkillContent params={params} />
      </Suspense>
    </div>
  );
}
