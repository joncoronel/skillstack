"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/cubby-ui/button";
import { cn } from "@/lib/utils";

export function NavLink({
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
