"use client";

import { useRouter } from "next/navigation";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/cubby-ui/button";

export function HomeContent({
  preloadedUser,
}: {
  preloadedUser: Preloaded<typeof api.auth.getCurrentUser>;
}) {
  const router = useRouter();
  const user = usePreloadedQuery(preloadedUser);

  if (!user) return null;

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-lg">
        Signed in as{" "}
        <span className="font-semibold">{user.name ?? user.email}</span>
      </p>
      <Button variant="outline" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
}
