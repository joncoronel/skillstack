import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getToken } from "@/lib/auth-server";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkillStack",
  description:
    "Discover, compare, and bundle AI coding assistant skills for your tech stack",
};

async function ConvexProviderWithToken({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fast path: skip the expensive HTTP call to Convex site URL when signed out.
  // getToken() always makes a network request when there's no cached JWT cookie,
  // even if the user has no session. Checking the session cookie first avoids this.
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("better-auth.session_token");
  const token = hasSession ? await getToken() : null;
  return (
    <ConvexClientProvider initialToken={token}>{children}</ConvexClientProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolageGrotesque.variable} antialiased`}
      >
        <div className="root">
          <Providers>
            <Suspense fallback={null}>
              <ConvexProviderWithToken>{children}</ConvexProviderWithToken>
            </Suspense>
          </Providers>
        </div>
      </body>
    </html>
  );
}
