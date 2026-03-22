"use client";

import Link from "next/link";
import { Button } from "@/components/ui/cubby-ui/button";
import { cn } from "@/lib/utils";

interface UpgradeBannerProps {
  message: string;
  className?: string;
}

export function UpgradeBanner({ message, className }: UpgradeBannerProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm",
        className,
      )}
    >
      <p className="text-muted-foreground">{message}</p>
      <Button
        nativeButton={false}
        variant="primary"
        size="sm"
        className="mt-2"
        render={<Link href="/pricing" />}
      >
        Upgrade to Pro
      </Button>
    </div>
  );
}
