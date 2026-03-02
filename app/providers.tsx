"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";

import {
  ToastProvider,
  AnchoredToastProvider,
} from "@/components/ui/cubby-ui/toast/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
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
    </NuqsAdapter>
  );
}
