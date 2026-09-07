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
  // Both panels are in the DOM from the start and the inactive one is
  // `display: none`, so the entering panel counts as newly rendered every time
  // `active` changes — but also on first mount, where an entrance is wrong (and
  // where `starting:translate-*` would put a transform context around a
  // skeleton, desyncing `bg-fixed`). A toggle is the exact condition, so derive
  // it from `active` rather than from a mount effect: the flag turns on in the
  // same render that flips `display`, so the two land in one commit and one
  // style resolution.
  //
  // A mount effect can't be trusted here even deferred through rAF. React
  // flushes pending passive effects synchronously when another update arrives
  // first, so a bare `useEffect` can add these classes before the browser has
  // resolved style for the just-committed subtree — and @starting-style then
  // still applies. That's the bug this replaced: every Crossfade that mounted
  // mid-session played its entrance once. TransitionPanel schedules around it
  // with a `requestAnimationFrame`; this has no timing to schedule around.
  //
  // Render-time setters, as in TransitionPanel's `previousKey`: React discards
  // and retries the render, so the reads below reflect the committed values.
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
