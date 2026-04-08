import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/cubby-ui/button";

export async function HeaderAuth() {
  const { userId } = await getAuth();

  if (!userId) {
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

  return <UserMenu />;
}
