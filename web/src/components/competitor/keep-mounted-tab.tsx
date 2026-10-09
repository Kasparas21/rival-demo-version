"use client";

import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useDeferredReady } from "@/hooks/use-deferred-ready";

/** Hidden tabs are unmounted after this long to free DOM, timers, and media. */
const IDLE_UNMOUNT_MS = 5 * 60 * 1000;

export function KeepMountedTab({
  active,
  children,
  className = "",
  /**
   * When true, mount hidden children once the page has settled (about 1.5 s, browser idle) so their data
   * hooks warm caches before the first visit, without competing with the tab on screen. Switching
   * competitor (a new path) waits again.
   */
  preload = true,
}: {
  active: boolean;
  children: ReactNode;
  /** Extra classes on the outer wrapper (e.g. overflow). */
  className?: string;
  preload?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const preloadReady = useDeferredReady(pathname);
  const [page, setPage] = useState(pathname);
  const [visited, setVisited] = useState(active);
  const [expired, setExpired] = useState(false);
  // Derived from props during render, not in effects: a new competitor starts unvisited.
  if (page !== pathname) {
    setPage(pathname);
    setVisited(active);
    setExpired(false);
  }
  if (active && !visited) setVisited(true);
  if (active && expired) setExpired(false);

  const show = active || (!expired && (visited || (preload && preloadReady)));

  useEffect(() => {
    if (active || !show) return;
    const timer = window.setTimeout(() => setExpired(true), IDLE_UNMOUNT_MS);
    return () => window.clearTimeout(timer);
  }, [active, show]);

  return (
    <div
      style={{ display: active ? "flex" : "none" }}
      className={`flex-1 min-h-0 flex-col ${className}`.trim()}
      aria-hidden={!active}
      {...(!active ? ({ inert: true } as unknown as HTMLAttributes<HTMLDivElement>) : {})}
    >
      {show ? children : null}
    </div>
  );
}
