"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/cubby-ui/button";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerHandle,
} from "@/components/ui/cubby-ui/drawer/drawer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CompassIcon,
  DashboardSquare01Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon_sm"
            className="sm:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
          </Button>

          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight"
          >
            SkillStack
            <span className="ml-0.5 inline-block size-1.5 rounded-full bg-primary align-super" />
          </Link>

          {/* Desktop nav */}
          <nav className="max-sm:hidden flex items-center gap-1">
            <NavLink href="/explore" icon={<HugeiconsIcon icon={CompassIcon} strokeWidth={2} className="size-4" />}>
              Explore
            </NavLink>
            <NavLink href="/dashboard" icon={<HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} className="size-4" />}>
              Dashboard
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop theme switcher */}
          <div className="max-sm:hidden">
            <ThemeSwitcher />
          </div>

          <AuthLoading>
            <Skeleton className="size-8 rounded-full sm:h-8 sm:w-16 sm:rounded-md" />
          </AuthLoading>
          <Authenticated>
            <UserMenu />
          </Authenticated>
          <Unauthenticated>
            <Button
              nativeButton={false}
              variant="primary"
              size="sm"
              render={<Link href="/sign-in" />}
            >
              Sign in
            </Button>
          </Unauthenticated>
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </header>
  );
}

function MobileDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <Drawer direction="bottom" open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHandle />
        <DrawerHeader>
          <DrawerTitle className="font-display text-lg font-bold tracking-tight">
            SkillStack
            <span className="ml-0.5 inline-block size-1.5 rounded-full bg-primary align-super" />
          </DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-1 px-4">
          <DrawerNavLink
            href="/explore"
            icon={CompassIcon}
            isActive={pathname === "/explore"}
          >
            Explore
          </DrawerNavLink>
          <DrawerNavLink
            href="/dashboard"
            icon={DashboardSquare01Icon}
            isActive={pathname === "/dashboard"}
          >
            Dashboard
          </DrawerNavLink>
        </DrawerBody>
        <DrawerFooter className="px-4">
          <div className="flex items-center justify-between rounded-lg px-3 py-2">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeSwitcher />
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function DrawerNavLink({
  href,
  children,
  icon,
  isActive,
}: {
  href: string;
  children: React.ReactNode;
  icon: typeof CompassIcon;
  isActive: boolean;
}) {
  return (
    <DrawerClose
      render={<Link href={href} />}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
        isActive && "bg-accent text-foreground"
      )}
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
      {children}
    </DrawerClose>
  );
}

function NavLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
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
      leftSection={icon}
    >
      {children}
    </Button>
  );
}
