import { Suspense } from "react";
import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { BundleView } from "./bundle-view";

function BundleSkeleton() {
  return (
    <>
      <Skeleton className="h-10 w-64 mb-4" />
      <Skeleton className="h-5 w-40 mb-8" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </>
  );
}

async function BundleContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const { id } = await params;
  const { share } = await searchParams;
  const preloadedBundle = await preloadAuthQuery(api.bundles.getByUrlId, {
    urlId: id,
    shareToken: share,
  });

  return <BundleView preloadedBundle={preloadedBundle} urlId={id} shareToken={share} />;
}

export default function BundlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12">
      <Suspense fallback={<BundleSkeleton />}>
        <BundleContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
