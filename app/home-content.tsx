"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserButton } from "@clerk/nextjs";

export function HomeContent({
  preloadedUser,
}: {
  preloadedUser: Preloaded<typeof api.users.current>;
}) {
  const user = usePreloadedQuery(preloadedUser);

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-lg">
        Signed in as{" "}
        <span className="font-semibold">{user.name ?? user.email}</span>
      </p>
      <UserButton signInUrl="/sign-in" />
    </div>
  );
}
