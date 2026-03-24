export type Plan = "free" | "pro";

export interface PlanDisplayInfo {
  name: string;
  description: string;
  price: string | null;
  priceYearly?: string;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Record<Plan, PlanDisplayInfo> = {
  free: {
    name: "Free",
    description: "Get started with SkillStack",
    price: null,
    features: [
      "Manual stack selection",
      "3 saved bundles",
      "Public bundles only",
      "Basic install commands",
    ],
  },
  pro: {
    name: "Pro",
    description: "For power users",
    price: "$9/month",
    priceYearly: "$90/year",
    highlighted: true,
    features: [
      "GitHub repo auto-detection",
      "Unlimited saved bundles",
      "Private bundles",
      "Bundle analytics",
      "Export as shell script or config",
    ],
  },
};
