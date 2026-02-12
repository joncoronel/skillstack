import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth";
import { BundleView } from "./bundle-view";

export const revalidate = 60;

export default async function BundlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const { slug } = await params;
  const { share } = await searchParams;
  const token = await getAuthToken();
  const preloadedBundle = await preloadQuery(
    api.bundles.getBySlug,
    { slug, shareToken: share },
    { token },
  );

  return <BundleView preloadedBundle={preloadedBundle} slug={slug} shareToken={share} />;
}
