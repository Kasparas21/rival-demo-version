"use client";

import { useEffect, useState } from "react";

/**
 * False until `delayMs` after `key` was first seen and the browser is idle, then true for that key.
 * Changing `key` (e.g. switching competitor) starts the wait again. For work that can follow the first
 * paint, so it doesn't compete with what's on screen.
 */
export function useDeferredReady(key: string, delayMs = 1500): boolean {
  const [readyKey, setReadyKey] = useState<string | null>(null);
  useEffect(() => {
    let idleId: number | null = null;
    const timer = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(() => setReadyKey(key), { timeout: 2000 });
      } else {
        setReadyKey(key);
      }
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      if (idleId !== null) window.cancelIdleCallback?.(idleId);
    };
  }, [key, delayMs]);
  return readyKey === key;
}
