"use client";

import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sun02Icon,
  Moon02Icon,
  ComputerIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/cubby-ui/button";

import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      variant="ghost"
      size="icon_sm"
    >
      <HugeiconsIcon
        icon={Sun02Icon}
        className={cn(
          " rotate-0 scale-100 transition-all! duration-300 dark:rotate-90 dark:scale-60 dark:blur-xs dark:opacity-0 transition-discrete"
        )}
        strokeWidth={2}
      />
      <HugeiconsIcon
        icon={Moon02Icon}
        className={cn(
          "-rotate-90 blur-xs opacity-0 scale-60 transition-all! duration-300 dark:rotate-0 dark:blur-none dark:opacity-100 dark:scale-100 transition-discrete"
        )}
        strokeWidth={2}
      />
    </Button>
  );
}
