import { redirect } from "next/navigation";
import { preloadAuthQuery, isAuthenticated } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { DashboardContent } from "./dashboard-content";

export async function DashboardBundles() {
  const hasAuth = await isAuthenticated();
  if (!hasAuth) redirect("/sign-in");

  const preloadedBundles = await preloadAuthQuery(api.bundles.listByUser, {});
  return <DashboardContent preloadedBundles={preloadedBundles} />;
}
