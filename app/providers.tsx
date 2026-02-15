"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ThemeProvider } from "next-themes";

import {
  ToastProvider,
  AnchoredToastProvider,
} from "@/components/ui/cubby-ui/toast/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <ClerkProvider afterSignOutUrl="/sign-in">
        <ConvexClientProvider>
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider position="bottom-right">
              <AnchoredToastProvider>{children}</AnchoredToastProvider>
            </ToastProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </ClerkProvider>
    </NuqsAdapter>
  );
}
