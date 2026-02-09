import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth";
import { DashboardContent } from "./dashboard-content";

export async function DashboardBundles() {
  const token = await getAuthToken();
  const preloadedBundles = await preloadQuery(
    api.bundles.listByUser,
    {},
    { token },
  );
  return <DashboardContent preloadedBundles={preloadedBundles} />;
}
