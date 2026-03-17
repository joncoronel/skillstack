"use client";

import * as React from "react";
import { useAnimatedHeight } from "@/hooks/cubby-ui/use-animated-height";
import { cn } from "@/lib/utils";

const CROSSFADE_CLASSES = cn(
  "ease-out-cubic transition-[opacity,filter,transform,scale] duration-200",
  "motion-reduce:transition-none",
);

export function Crossfade({
  active,
  children,
}: {
  active: boolean;
  children: [React.ReactNode, React.ReactNode];
}) {
  const { outerRef, innerRef } = useAnimatedHeight();
  const [first, second] = children;

  return (
    <div
      ref={outerRef}
      className="transition-[height] duration-270 ease-[cubic-bezier(0.25,1,0.5,1)]"
    >
      <div ref={innerRef} className="grid">
        <div
          className={cn(
            "[grid-area:1/1]",
            CROSSFADE_CLASSES,
            active
              ? "contain-[size] pointer-events-none scale-97 opacity-0 blur-sm"
              : "scale-100 opacity-100",
          )}
          aria-hidden={active}
        >
          {first}
        </div>

        <div
          className={cn(
            "[grid-area:1/1]",
            CROSSFADE_CLASSES,
            active
              ? "scale-100 opacity-100"
              : "contain-[size] pointer-events-none scale-97 opacity-0 blur-sm",
          )}
          aria-hidden={!active}
        >
          {second}
        </div>
      </div>
    </div>
  );
}
