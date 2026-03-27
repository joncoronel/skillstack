import "server-only";

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { ClerkOfflineError } from "@clerk/nextjs/errors";
import { redirect } from "next/navigation";

export async function getAuthToken() {
  try {
    return (await (await auth()).getToken({ template: "convex" })) ?? undefined;
  } catch (error) {
    if (error instanceof ClerkOfflineError) return undefined;
    throw error;
  }
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
