import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { HomeContent } from "./home-content";
import { getAuthToken } from "@/lib/auth";

async function AuthenticatedHome() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const token = await getAuthToken();
  const preloadedUser = await preloadQuery(api.users.current, {}, { token });
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
