"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/cubby-ui/button";

export function HeaderAuthClient({
  initialSignedIn,
}: {
  initialSignedIn: boolean;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const signedIn = isLoaded ? isSignedIn : initialSignedIn;

  if (signedIn) return <UserMenu />;

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
