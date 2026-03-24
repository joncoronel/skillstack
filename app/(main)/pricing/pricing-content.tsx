"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { CheckoutLink } from "@convex-dev/polar/react";
import { api } from "@/convex/_generated/api";
import { PLANS, type Plan } from "@/lib/plans";
import { useUserPlan } from "@/hooks/use-user-plan";
import { Check } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/cubby-ui/card";
import { Badge } from "@/components/ui/cubby-ui/badge";
import { Button } from "@/components/ui/cubby-ui/button";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";

const PLAN_KEYS: Plan[] = ["free", "pro"];
// Must match proMonthly in convex/polar.ts
const PRO_MONTHLY_PRODUCT_ID = "81f91b1c-5b5b-464e-8be2-d925e3652c59";

export function PricingContent() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-2">
      {PLAN_KEYS.map((planKey) => {
        const plan = PLANS[planKey];

        return (
          <Card
            key={planKey}
            className={
              plan.highlighted ? "ring-2 ring-primary relative" : undefined
            }
          >
            {plan.highlighted && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                Most popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="font-display text-lg">
                {plan.name}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="mb-6">
                <span className="font-display text-3xl font-bold">
                  {plan.price ?? "Free"}
                </span>
                {plan.priceYearly && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    or {plan.priceYearly}
                  </span>
                )}
              </div>
              <ul className="space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {planKey === "free" ? (
                <Button
                  nativeButton={false}
                  variant="outline"
                  className="w-full"
                  render={<Link href="/sign-up" />}
                >
                  Get started
                </Button>
              ) : (
                <>
                  <AuthLoading>
                    <Skeleton className="h-9 w-full rounded-md" />
                  </AuthLoading>
                  <Unauthenticated>
                    <Button
                      nativeButton={false}
                      variant="primary"
                      className="w-full"
                      render={<Link href="/sign-up" />}
                    >
                      Get started
                    </Button>
                  </Unauthenticated>
                  <Authenticated>
                    <ProCardAction />
                  </Authenticated>
                </>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

function ProCardAction() {
  const { plan, isLoading } = useUserPlan();

  if (isLoading) return <Skeleton className="h-9 w-full rounded-md" />;

  if (plan === "pro") {
    return (
      <Button
        nativeButton={false}
        variant="outline"
        className="w-full"
        render={<Link href="/settings/custom?tab=billing" />}
      >
        Manage subscription
      </Button>
    );
  }

  return (
    <CheckoutLink
      polarApi={{ generateCheckoutLink: api.polar.generateCheckoutLink }}
      productIds={[PRO_MONTHLY_PRODUCT_ID]}
      className="w-full"
      embed={false}
      lazy
    >
      <Button variant="primary" className="w-full">
        Upgrade to Pro
      </Button>
    </CheckoutLink>
  );
}
