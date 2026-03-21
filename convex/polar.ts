import { Polar } from "@convex-dev/polar";
import { api, components } from "./_generated/api";
import { query } from "./_generated/server";
import { DataModel } from "./_generated/dataModel";

// Product IDs from Polar sandbox. Also referenced in:
// - app/(main)/pricing/pricing-content.tsx (PRO_MONTHLY_PRODUCT_ID)
const products = {
  proMonthly: "81f91b1c-5b5b-464e-8be2-d925e3652c59",
  proYearly: "5a16b4c6-bcd2-4f50-980f-3239c1fea660",
} as const;

export const getUserInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User must be logged in to manage subscriptions");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.email) {
      throw new Error("User email is required for billing");
    }
    return { userId: user._id, email: user.email };
  },
});

export const polar: Polar<DataModel, typeof products> = new Polar(
  components.polar,
  {
    getUserInfo: async (ctx) => {
      return await ctx.runQuery(api.polar.getUserInfo);
    },
    products,
  },
);

export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  getConfiguredProducts,
  listAllProducts,
  listAllSubscriptions,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();
