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
  const cookieStore = await cookies();
  const hasSession = cookieStore.has("better-auth.session_token");
  const hasJwt = cookieStore.has("better-auth.convex_jwt");
  // Only call getToken() when the JWT cookie exists — it returns instantly from
  // the cookie value with no network call. When the JWT cookie is missing (expired),
  // skip it: getToken() would make a slow HTTP call to Convex AND the resulting
  // cookie would only reach the Next.js server, not the browser. Instead, pass
  // hasSession=true so the client fetches via /api/auth/convex/token, which goes
  // through the Next.js proxy and properly sets the cookie in the browser.
  const token = hasSession && hasJwt ? await getToken() : null;
  return (
    <ConvexClientProvider initialToken={token} hasSession={hasSession}>
      {children}
    </ConvexClientProvider>
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
