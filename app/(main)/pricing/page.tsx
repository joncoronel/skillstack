import type { Metadata } from "next";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = {
  title: "Pricing - SkillStack",
  description:
    "Choose a plan for SkillStack. Start free, upgrade when you need more power.",
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
      <div className="mb-12 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Simple pricing
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Start free, upgrade when you need more power.
        </p>
      </div>
      <PricingContent />
    </main>
  );
}
