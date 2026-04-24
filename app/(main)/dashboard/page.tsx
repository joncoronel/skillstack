import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { verifySession, getAuthToken } from "@/lib/auth";
import { DashboardContent } from "./dashboard-content";
import { DashboardMasthead } from "./dashboard-masthead";
import { DashboardSkeleton } from "./dashboard-skeleton";

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
