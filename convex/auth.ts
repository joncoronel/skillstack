import { convex } from "better-convex/auth";
import authConfig from "./auth.config";
import { defineAuth } from "./generated/auth";
import type { QueryCtx, MutationCtx } from "./_generated/server";

export default defineAuth(() => {
  return {
    baseURL: process.env.SITE_URL!,
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    plugins: [
      convex({
        authConfig,
        jwks: process.env.JWKS,
      }),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24 * 15, // 15 days
    },
    trustedOrigins: [process.env.SITE_URL ?? "http://localhost:3000"],
  };
});

// Get the authenticated user's ID from the JWT identity directly.
// This avoids unnecessary DB queries per call.
// Returns null if not authenticated.
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

// Same as getAuthUserId but throws if not authenticated.
export async function requireAuthUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
