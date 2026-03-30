"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/cubby-ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CompassIcon,
  DashboardSquare01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export function DesktopNav() {
  return (
    <nav className="max-sm:hidden flex items-center gap-1">
      <NavLink
        href="/explore"
        icon={
          <HugeiconsIcon
            icon={CompassIcon}
            strokeWidth={2}
            className="size-4"
          />
        }
      >
        Explore
      </NavLink>
      <NavLink
        href="/dashboard"
        icon={
          <HugeiconsIcon
            icon={DashboardSquare01Icon}
            strokeWidth={2}
            className="size-4"
          />
        }
      >
        Dashboard
      </NavLink>
      <NavLink
        href="/pricing"
        icon={
          <HugeiconsIcon
            icon={Tag01Icon}
            strokeWidth={2}
            className="size-4"
          />
        }
      >
        Pricing
      </NavLink>
    </nav>
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
