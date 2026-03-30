import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { verifySession, getAuthToken } from "@/lib/auth";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { DashboardContent } from "./dashboard-content";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Your bundles</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your saved skill bundles.
        </p>
      </div>

      <Suspense fallback={<BundleGridSkeleton />}>
        <DashboardLoader />
      </Suspense>
    </main>
  );
}

async function DashboardLoader() {
  const [, token] = await Promise.all([verifySession(), getAuthToken()]);
  const preloadedBundles = await preloadQuery(
    api.bundles.listByUser,
    {},
    { token },
  );
  return <DashboardContent preloadedBundles={preloadedBundles} />;
}

function BundleGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}
