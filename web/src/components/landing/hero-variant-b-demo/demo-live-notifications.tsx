"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DEMO_COMPETITOR,
  DEMO_LIVE_NOTIFICATIONS,
} from "@/lib/landing/hero-variant-b-demo-data";

const CYCLE_MS = 4000;
const VISIBLE_MS = 2000;
const EXIT_MS = 240;

type NotifPhase = "enter" | "exit" | "hidden";

/** Compact alert toast - top-right of demo content, below header (won't cover tab arrows). */
export function DemoLiveNotifications() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<NotifPhase>("enter");

  useEffect(() => {
    let currentIndex = 0;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;

    const showCurrent = () => {
      setIndex(currentIndex);
      setPhase("enter");

      hideTimer = setTimeout(() => {
        setPhase("exit");
        exitTimer = setTimeout(() => setPhase("hidden"), EXIT_MS);
      }, VISIBLE_MS);

      currentIndex = (currentIndex + 1) % DEMO_LIVE_NOTIFICATIONS.length;
    };

    showCurrent();
    const cycleTimer = setInterval(showCurrent, CYCLE_MS);

    return () => {
      clearInterval(cycleTimer);
      if (hideTimer) clearTimeout(hideTimer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, []);

  const notification = DEMO_LIVE_NOTIFICATIONS[index]!;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none absolute right-2 top-2 z-40 sm:right-3 sm:top-2.5"
    >
      {phase === "hidden" ? null : (
        <div
          key={notification.id}
          className={`hero-demo-live-notif flex max-w-[11.5rem] items-center gap-2 rounded-lg border border-[#bfdbfe] bg-white py-1.5 pl-1.5 pr-2 shadow-[0_0_0_1px_rgba(37,99,235,0.12),0_8px_20px_-6px_rgba(37,99,235,0.28),0_4px_10px_-4px_rgba(15,23,42,0.12)] ring-2 ring-[#2563eb]/15 sm:max-w-[12.5rem] sm:gap-2 sm:py-2 sm:pl-2 sm:pr-2.5 ${
            phase === "exit" ? "hero-demo-live-notif--exit" : "hero-demo-live-notif--enter"
          }`}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#2563eb] text-white shadow-sm sm:size-7">
            <Bell className="size-3 sm:size-3.5" strokeWidth={2.5} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[10px] font-bold leading-tight text-[#0f172a] sm:text-[11px]">
              {notification.title}
            </p>
            <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.04em] text-[#2563eb]">
              {notification.type}
            </p>
          </div>
          <span className="sr-only">
            {notification.detail} · {DEMO_COMPETITOR.name}
          </span>
        </div>
      )}
    </div>
  );
}
