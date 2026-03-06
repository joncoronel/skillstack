import "server-only";

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function getAuthToken() {
  return (await (await auth()).getToken({ template: "convex" })) ?? undefined;
}

/**
 * Verifies the current user session server-side.
 * Redirects to /sign-in if not authenticated.
 * Cached per request to avoid duplicate auth checks in the same render pass.
 */
export const verifySession = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return { userId };
});
