import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth";
import { BundleView } from "./bundle-view";

export const revalidate = 60;

export default async function BundlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const { id } = await params;
  const { share } = await searchParams;
  const token = await getAuthToken();
  const preloadedBundle = await preloadQuery(
    api.bundles.getByUrlId,
    { urlId: id, shareToken: share },
    { token },
  );

  return <BundleView preloadedBundle={preloadedBundle} urlId={id} shareToken={share} />;
}
