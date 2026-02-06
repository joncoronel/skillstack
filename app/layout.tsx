import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getToken } from "@/lib/auth-server";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillStack",
  description: "SkillStack",
};

async function ConvexProviderWithToken({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();
  return (
    <ConvexClientProvider initialToken={token}>
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <ConvexProviderWithToken>{children}</ConvexProviderWithToken>
        </Suspense>
      </body>
    </html>
  );
}
