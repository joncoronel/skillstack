"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClerkLoaded, ClerkLoading, useAuth, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/cubby-ui/button";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

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

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Button
      nativeButton={false}
      variant="ghost"
      size="sm"
      render={<Link href={href} />}
      className={cn(isActive && "text-foreground font-medium")}
    >
      {children}
    </Button>
  );
}

function AuthNav() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;
  return <NavLink href="/dashboard">Dashboard</NavLink>;
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
