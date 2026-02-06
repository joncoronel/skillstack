"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/cubby-ui/button";

export default function Home() {
  const user = useQuery(api.auth.getCurrentUser);
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Not signed in</p>
        <Button variant="primary" onClick={() => router.push("/sign-in")}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-lg">
        Signed in as <span className="font-semibold">{user.name ?? user.email}</span>
      </p>
      <Button variant="outline" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
}
