"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/cubby-ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/cubby-ui/dropdown-menu";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initials = getInitials(user.firstName, user.lastName);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Avatar size="sm">
          <AvatarImage src={user.imageUrl} alt={user.fullName ?? "User avatar"} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-sm font-medium">{user.fullName}</span>
          <span className="text-muted-foreground text-xs font-normal">
            {user.primaryEmailAddress?.emailAddress}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem render={<Link href="/dashboard" />} onClick={() => setOpen(false)}>
          Dashboard
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/settings" />} onClick={() => setOpen(false)}>
          Manage account
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/settings/custom" />} onClick={() => setOpen(false)}>
          Account settings
        </DropdownMenuLinkItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { setOpen(false); signOut({ redirectUrl: "/sign-in" }); }}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
