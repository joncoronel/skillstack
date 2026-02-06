import { isAuthenticated } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasAuth = await isAuthenticated();
  if (hasAuth) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {children}
    </div>
  );
}
