import { Suspense } from "react";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { DashboardBundles } from "./dashboard-bundles";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your bundles</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your saved skill bundles.
        </p>
      </div>

      <Suspense fallback={<BundleGridSkeleton />}>
        <DashboardBundles />
      </Suspense>
    </main>
  );
}

function BundleGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-2xl" />
      ))}
    </div>
  );
}
