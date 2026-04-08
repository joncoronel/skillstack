"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Plan } from "@/lib/plans";

export function useUserPlan() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const result = useQuery(
    api.plans.currentPlan,
    isAuthenticated ? {} : "skip",
  );

  return {
    plan: (result?.plan ?? "free") as Plan,
    limits: result?.limits ?? null,
    gatingEnabled: result?.gatingEnabled ?? false,
    isLoading: authLoading || (isAuthenticated && result === undefined),
  };
}
