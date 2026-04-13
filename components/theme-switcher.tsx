"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sun02Icon,
  Moon02Icon,
  ComputerIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/cubby-ui/button";

const CYCLE = ["light", "dark", "system"] as const;
const LABELS: Record<string, string> = {
  light: "Switch to dark theme",
  dark: "Switch to system theme",
  system: "Switch to light theme",
};

const subscribe = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const mounted = useMounted();

  function cycleTheme() {
    const current = CYCLE.indexOf(theme as (typeof CYCLE)[number]);
    const next = CYCLE[(current + 1) % CYCLE.length];
    setTheme(next);
  }

  // Before mount, render a static placeholder so SSR and client match.
  // The Suspense boundary in app-header already shows a skeleton fallback,
  // but this guards against the hydration window.
  const active = mounted ? theme : undefined;

  return (
    <Button
      onClick={cycleTheme}
      aria-label={mounted ? LABELS[theme ?? "system"] : "Toggle theme"}
      variant="ghost"
      size="icon_sm"
    >
      {/* Light mode: sun */}
      <HugeiconsIcon
        icon={Sun02Icon}
        data-visible={active === "light" || undefined}
        className="absolute transition-all! duration-200 rotate-90 scale-60 blur-xs opacity-0 data-visible:rotate-0 data-visible:scale-100 data-visible:blur-none data-visible:opacity-100 transition-discrete"
        strokeWidth={2}
      />
      {/* Dark mode: moon */}
      <HugeiconsIcon
        icon={Moon02Icon}
        data-visible={active === "dark" || undefined}
        className="absolute transition-all! duration-200 -rotate-90 scale-60 blur-xs opacity-0 data-visible:rotate-0 data-visible:scale-100 data-visible:blur-none data-visible:opacity-100 transition-discrete"
        strokeWidth={2}
      />
      {/* System mode: computer */}
      <HugeiconsIcon
        icon={ComputerIcon}
        data-visible={active === "system" || undefined}
        className="absolute transition-all! duration-200 rotate-90 scale-60 blur-xs opacity-0 data-visible:rotate-0 data-visible:scale-100 data-visible:blur-none data-visible:opacity-100 transition-discrete"
        strokeWidth={2}
      />
    </Button>
  );
}
