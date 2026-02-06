import { Suspense } from "react";
import { isAuthenticated, preloadAuthQuery } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { HomeContent } from "./home-content";

async function AuthenticatedHome() {
  const hasAuth = await isAuthenticated();
  if (!hasAuth) redirect("/sign-in");

  const preloadedUser = await preloadAuthQuery(api.auth.getCurrentUser);
  return <HomeContent preloadedUser={preloadedUser} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <AuthenticatedHome />
    </Suspense>
  );
}
