import { query } from "./_generated/server";
import {
  getUserPlan,
  getPlanLimits,
  FEATURE_GATING_ENABLED,
} from "./lib/plans";

export const currentPlan = query({
  args: {},
  handler: async (ctx) => {
    const plan = await getUserPlan(ctx);
    const limits = getPlanLimits(plan);
    return {
      plan,
      limits,
      gatingEnabled: FEATURE_GATING_ENABLED,
    };
  },
});
