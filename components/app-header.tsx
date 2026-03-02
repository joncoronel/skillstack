import { Suspense } from "react";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth-server";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NavLink } from "./nav-link";
import { SignOutButton } from "./sign-out-button";
import { Button } from "@/components/ui/cubby-ui/button";

async function AuthenticatedNav() {
  const hasAuth = await isAuthenticated();
  if (!hasAuth) return null;

  return <NavLink href="/dashboard">Dashboard</NavLink>;
}

async function AuthButton() {
  const hasAuth = await isAuthenticated();

  if (hasAuth) {
    return <SignOutButton />;
  }

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

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight"
          >
            SkillStack
            <span className="ml-0.5 inline-block size-1.5 rounded-full bg-primary align-super" />
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/explore">Explore</NavLink>
            <Suspense fallback={null}>
              <AuthenticatedNav />
            </Suspense>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Suspense fallback={<Skeleton className="h-8 w-16 rounded-md" />}>
            <AuthButton />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
