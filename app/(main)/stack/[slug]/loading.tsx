import { Skeleton } from "@/components/ui/cubby-ui/skeleton";

export default function BundleLoading() {
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
