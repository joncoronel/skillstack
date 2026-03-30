import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { BundleView } from "./bundle-view";

export default function BundlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  return (
    <Suspense fallback={<BundleViewSkeleton />}>
      <BundleLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BundleLoader({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const [{ id }, { share }, token] = await Promise.all([
    params,
    searchParams,
    getAuthToken(),
  ]);
  const [preloadedBundle, preloadedPlan] = await Promise.all([
    preloadQuery(
      api.bundles.getByUrlId,
      { urlId: id, shareToken: share },
      { token },
    ),
    preloadQuery(api.plans.currentPlan, {}, { token }),
  ]);

  return (
    <BundleView
      preloadedBundle={preloadedBundle}
      preloadedPlan={preloadedPlan}
      urlId={id}
      shareToken={share}
    />
  );
}

function BundleViewSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12">
      <Skeleton className="h-10 w-64 mb-4" />
      <Skeleton className="h-5 w-40 mb-8" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
