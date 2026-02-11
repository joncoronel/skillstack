"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/cubby-ui/button";
import { ScrollArea } from "@/components/ui/cubby-ui/scroll-area/scroll-area";
import { TECHNOLOGIES } from "@/lib/technologies";

const techNameMap = new Map(TECHNOLOGIES.map((t) => [t.id, t.name]));

interface StickyTechBarProps {
  selected: string[];
  onRemove: (id: string) => void;
  onEditClick: () => void;
  selectorRef: React.RefObject<HTMLElement | null>;
}

export function StickyTechBar({
  selected,
  onRemove,
  onEditClick,
  selectorRef,
}: StickyTechBarProps) {
  const [isPastSelector, setIsPastSelector] = useState(false);

  useEffect(() => {
    const el = selectorRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPastSelector(!entry.isIntersecting);
      },
      { rootMargin: "-56px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [selectorRef]);

  const shouldShow = isPastSelector && selected.length > 0;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-x-0 top-14 z-30 border-b bg-background/80 backdrop-blur-sm"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
            <ScrollArea fadeEdges="x" className="min-w-0 flex-1" hideScrollbar>
              <div className="flex items-center gap-1.5">
                {selected.map((id) => (
                  <button
                    key={id}
                    onClick={() => onRemove(id)}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    {techNameMap.get(id) ?? id}
                    <XIcon className="size-3" />
                  </button>
                ))}
              </div>
            </ScrollArea>
            <Button
              variant="ghost"
              size="xs"
              onClick={onEditClick}
              className="shrink-0 text-muted-foreground"
            >
              Edit stack
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
