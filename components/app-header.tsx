"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/cubby-ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function AppHeader() {
  const { isSignedIn } = useAuth();

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
            {isSignedIn && (
              <Button
                nativeButton={false}
                variant="ghost"
                size="sm"
                render={<Link href="/dashboard" />}
              >
                Dashboard
              </Button>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          {isSignedIn ? (
            <UserButton />
          ) : (
            <Button
              nativeButton={false}
              variant="primary"
              size="sm"
              render={<Link href="/sign-in" />}
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
