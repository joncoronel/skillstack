import { QueryCtx } from "./_generated/server";
import { getAuthUserId } from "./auth";

export type CurrentUser = {
  userId: string;
  name: string;
  email?: string;
  image?: string;
};

export async function getCurrentUserOrThrow(
  ctx: QueryCtx,
): Promise<CurrentUser> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Can't get current user");
  return user;
}

export async function getCurrentUser(
  ctx: QueryCtx,
): Promise<CurrentUser | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return {
    userId: identity.subject,
    name: identity.name ?? "User",
    email: identity.email,
    image: identity.pictureUrl,
  };
}
