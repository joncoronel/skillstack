import { useEffect, useRef, useState } from "react";

export function useCollapsibleHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.target.getBoundingClientRect().height;
        if (h > 0) setHeight(h);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, height };
}
