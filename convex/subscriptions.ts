import { query } from "./_generated/server";
import { polar } from "./polar";
import { getCurrentUser } from "./users";

export const currentSubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    try {
      const subscription = await polar.getCurrentSubscription(ctx, {
        userId: user._id,
      });

      if (!subscription) return null;

      return {
        productKey: subscription.productKey,
        productName: subscription.product.name,
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        recurringInterval: subscription.recurringInterval,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        startedAt: subscription.startedAt,
      };
    } catch (error) {
      console.error("Failed to fetch subscription", error);
      return null;
    }
  },
});
