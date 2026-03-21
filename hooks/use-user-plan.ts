"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Plan } from "@/lib/plans";

export function useUserPlan() {
  const result = useQuery(api.plans.currentPlan);

  return {
    plan: (result?.plan ?? "free") as Plan,
    limits: result?.limits ?? null,
    gatingEnabled: result?.gatingEnabled ?? false,
    isLoading: result === undefined,
  };
}
