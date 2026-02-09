import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { BundleView } from "./bundle-view";

export const revalidate = 60;

export default async function BundlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const preloadedBundle = await preloadQuery(api.bundles.getBySlug, { slug });

  return <BundleView preloadedBundle={preloadedBundle} />;
}
