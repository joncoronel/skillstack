import { cache } from "react";
import { headers } from "next/headers";
import { convexBetterAuth } from "better-convex/auth/nextjs";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { FunctionReference, FunctionArgs } from "convex/server";

const { createContext, createCaller, handler } = convexBetterAuth({
  api,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});

const createRSCContext = cache(async () => {
  return createContext({ headers: await headers() });
});

const caller = createCaller(createRSCContext);

export { handler };

export async function getToken(): Promise<string | null> {
  const token = await caller.getToken();
  return token ?? null;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await caller.getToken();
  return token != null;
}

export async function preloadAuthQuery<F extends FunctionReference<"query">>(
  query: F,
  args: FunctionArgs<F>,
) {
  const token = await caller.getToken();
  return preloadQuery(query, args, token ? { token } : undefined);
}
