"use client";

import * as React from "react";
import { useAnimatedHeight } from "@/hooks/cubby-ui/use-animated-height";
import { cn } from "@/lib/utils";

const CROSSFADE_BASE = cn(
  "transition-[opacity,filter,translate,display] duration-240 ease-[cubic-bezier(0.32,0.72,0,1)] transition-discrete",
  "motion-reduce:transition-none",
);

const CROSSFADE_STARTING = "starting:opacity-0 starting:blur-sm";

export function Crossfade({
  active,
  children,
}: {
  active: boolean;
  children: [React.ReactNode, React.ReactNode];
}) {
  const { outerRef, innerRef } = useAnimatedHeight();
  const [first, second] = children;

  // Withhold @starting-style until `active` has actually flipped once.
  //
  // Both panels are always in the DOM and the inactive one is `display: none`,
  // so the entering panel is newly rendered on every flip — and on first mount,
  // where an entrance is wrong and `starting:translate-*` would wrap a skeleton
  // in a transform context that desyncs `bg-fixed`. Deriving the flag during
  // render turns it on in the same commit as the `display` change. A mount
  // effect cannot match that even deferred through rAF: React flushes passive
  // effects synchronously when another update arrives first, so the classes
  // could land before the browser had resolved style for the new subtree, and
  // @starting-style would still apply.
  const [previousActive, setPreviousActive] = React.useState(active);
  const [hasToggled, setHasToggled] = React.useState(false);
  if (active !== previousActive) {
    setPreviousActive(active);
    setHasToggled(true);
  }

  return (
    <div
      ref={outerRef}
      className="transition-[height] duration-270 ease-[cubic-bezier(0.32,0.72,0,1)]"
    >
      <div ref={innerRef} className="grid">
        <div
          className={cn(
            "[grid-area:1/1]",
            CROSSFADE_BASE,
            hasToggled && CROSSFADE_STARTING,
            hasToggled && "starting:translate-y-3",
            active
              ? "contain-[size] hidden opacity-0 blur-sm translate-y-3 pointer-events-none"
              : "opacity-100",
          )}
          aria-hidden={active}
        >
          {first}
        </div>

        <div
          className={cn(
            "[grid-area:1/1]",
            CROSSFADE_BASE,
            hasToggled && CROSSFADE_STARTING,
            hasToggled && "starting:-translate-y-3",
            active
              ? "opacity-100"
              : "contain-[size] hidden opacity-0 blur-sm -translate-y-3 pointer-events-none",
          )}
          aria-hidden={!active}
        >
          {second}
        </div>
      </div>
    </div>
  );
}
