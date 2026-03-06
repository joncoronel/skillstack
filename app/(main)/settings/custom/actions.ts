"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export async function revokeSession(sessionId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const client = await clerkClient();
  await client.sessions.revokeSession(sessionId);
}
