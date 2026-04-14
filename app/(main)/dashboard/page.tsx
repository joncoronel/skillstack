import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { verifySession, getAuthToken } from "@/lib/auth";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { DashboardContent } from "./dashboard-content";
import { DashboardMasthead } from "./dashboard-masthead";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
      <div className="space-y-10">
        <DashboardMasthead />

        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardLoader />
        </Suspense>
      </div>
    </main>
  );
}

async function DashboardLoader() {
  // Note: verifySession() + getAuthToken() both access cookies, which "unlocks"
  // Math.random() for the preloadQuery calls below. cacheComponents requires
  // dynamic data access before any code that uses Math.random().
  const [, token] = await Promise.all([verifySession(), getAuthToken()]);
  const [preloadedBundles, preloadedPlan] = await Promise.all([
    preloadQuery(api.bundles.listByUser, {}, { token }),
    preloadQuery(api.plans.currentPlan, {}, { token }),
  ]);
  return (
    <DashboardContent
      preloadedBundles={preloadedBundles}
      preloadedPlan={preloadedPlan}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 divide-x divide-y border-y md:grid-cols-4 md:divide-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-5">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="mt-3 h-8 w-20 rounded" />
          </div>
        ))}
      </div>
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-7 w-36 rounded" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
