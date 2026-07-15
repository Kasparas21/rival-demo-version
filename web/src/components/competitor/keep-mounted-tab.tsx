"use client";

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

/** Hidden tabs are unmounted after this long to free DOM, timers, and media. */
const IDLE_UNMOUNT_MS = 5 * 60 * 1000;

export function KeepMountedTab({
  active,
  children,
  className = "",
  /** When true, mount children immediately so data hooks can warm caches before first visit. */
  preload = true,
}: {
  active: boolean;
  children: ReactNode;
  /** Extra classes on the outer wrapper (e.g. overflow). */
  className?: string;
  preload?: boolean;
}) {
  const [hasMounted, setHasMounted] = useState(active || preload);
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      setHasMounted(true);
      return;
    }
    if (!hasMounted) return;
    idleTimerRef.current = window.setTimeout(() => {
      setHasMounted(false);
    }, IDLE_UNMOUNT_MS);
    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [active, hasMounted]);

  return (
    <div
      style={{ display: active ? "flex" : "none" }}
      className={`flex-1 min-h-0 flex-col ${className}`.trim()}
      aria-hidden={!active}
      {...(!active ? ({ inert: true } as unknown as HTMLAttributes<HTMLDivElement>) : {})}
    >
      {hasMounted ? children : null}
    </div>
  );
}
