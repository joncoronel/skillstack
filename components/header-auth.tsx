import { getAuth } from "@/lib/auth";
import { HeaderAuthClient } from "@/components/header-auth-client";

export async function HeaderAuth() {
  const { userId } = await getAuth();
  return <HeaderAuthClient initialSignedIn={!!userId} />;
}
