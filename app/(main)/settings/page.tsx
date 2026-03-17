import type { Metadata } from "next";
import { UserProfile } from "@clerk/nextjs";
import { verifySession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  await verifySession();
  return (
    <div className="mx-auto max-w-4xl py-8 px-4">
      <UserProfile routing="hash" />
    </div>
  );
}
