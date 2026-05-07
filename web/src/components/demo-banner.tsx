"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "demo_banner_dismissed";

export function DemoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(STORAGE_KEY) === "1") {
          return;
        }
      } catch {
        /* localStorage may be blocked */
      }
      setVisible(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="relative z-[100] flex w-full shrink-0 min-h-9 items-center justify-center gap-2 sm:gap-3 border-b border-amber-200/80 bg-[#fef9c3] px-3 py-1.5 text-center text-xs text-amber-950 sm:text-left sm:pr-2"
      role="status"
    >
      <p className="min-w-0 flex-1 leading-snug sm:text-left">
        <span aria-hidden>👋</span> Demo Mode — some features don’t work.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1.5 text-amber-900/80 hover:bg-amber-200/60 hover:text-amber-950"
        aria-label="Dismiss demo banner"
      >
        <span className="text-base leading-none">×</span>
      </button>
    </div>
  );
}
