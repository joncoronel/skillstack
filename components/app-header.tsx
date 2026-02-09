"use client";

import Link from "next/link";
import { ClerkLoaded, ClerkLoading, useAuth, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/cubby-ui/button";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            SkillStack
          </Link>
          <nav className="flex items-center gap-1">
            <Button
              nativeButton={false}
              variant="ghost"
              size="sm"
              render={<Link href="/explore" />}
            >
              Explore
            </Button>
            <ClerkLoaded>
              <AuthNav />
            </ClerkLoaded>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <ClerkLoading>
            <Skeleton className="h-8 w-16 rounded-md" />
          </ClerkLoading>
          <ClerkLoaded>
            <AuthButton />
          </ClerkLoaded>
        </div>
      </div>
    </header>
  );
}

function AuthNav() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;
  return (
    <Button
      nativeButton={false}
      variant="ghost"
      size="sm"
      render={<Link href="/dashboard" />}
    >
      Dashboard
    </Button>
  );
}

function AuthButton() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <UserButton />;
  return (
    <Button
      nativeButton={false}
      variant="primary"
      size="sm"
      render={<Link href="/sign-in" />}
    >
      Sign in
    </Button>
  );
}
