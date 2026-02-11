import { Suspense } from "react";
import { CompareView } from "./compare-view";

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-12 pb-20">
      <h1 className="text-2xl font-bold tracking-tight mb-8">
        Compare Skills
      </h1>
      <Suspense>
        <CompareView />
      </Suspense>
    </main>
  );
}
