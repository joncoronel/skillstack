import { createAuthClient } from "better-auth/react";
import { convexClient } from "better-convex/auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL,
  plugins: [convexClient()],
});
