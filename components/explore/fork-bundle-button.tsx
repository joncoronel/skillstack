"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/cubby-ui/button";

interface ForkBundleButtonProps {
  bundleId: Id<"bundles">;
  className?: string;
}

export function ForkBundleButton({
  bundleId,
  className,
}: ForkBundleButtonProps) {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const forkBundle = useMutation(api.bundles.forkBundle);
  const [forking, setForking] = useState(false);

  async function handleFork() {
    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    setForking(true);
    try {
      const result = await forkBundle({ bundleId });
      router.push(`/stack/${result.urlId}`);
    } finally {
      setForking(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFork}
      loading={forking}
      className={className}
    >
      Fork
    </Button>
  );
}
