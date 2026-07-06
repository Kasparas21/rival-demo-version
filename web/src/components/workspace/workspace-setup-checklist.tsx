"use client";

import { Check, Circle } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

type SetupItem = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  tab: string;
  sub?: string;
};

type Props = {
  hasAdsSetup: boolean;
  hasOrganicSocials: boolean;
  hasTrackedPages: boolean;
  hasEmailTracker: boolean;
  onNavigate: (tab: string, sub?: string | null) => void;
  className?: string;
};

export function WorkspaceSetupChecklist({
  hasAdsSetup,
  hasOrganicSocials,
  hasTrackedPages,
  hasEmailTracker,
  onNavigate,
  className,
}: Props) {
  const items: SetupItem[] = useMemo(
    () => [
      {
        id: "paid",
        label: "Connect ad libraries",
        detail: "Paid Media → Settings",
        done: hasAdsSetup,
        tab: "ads library",
        sub: "paid-media-settings",
      },
      {
        id: "organic",
        label: "Add social handles",
        detail: "Organic → Settings",
        done: hasOrganicSocials,
        tab: "organic",
        sub: "organic-settings",
      },
      {
        id: "website",
        label: "Track your homepage",
        detail: "Website → Tracked pages",
        done: hasTrackedPages,
        tab: "website",
        sub: "tracked",
      },
      {
        id: "email",
        label: "Set up email tracking",
        detail: "Subscribe your newsletter",
        done: hasEmailTracker,
        tab: "email-marketing",
        sub: "inbox",
      },
    ],
    [hasAdsSetup, hasOrganicSocials, hasTrackedPages, hasEmailTracker],
  );

  const remaining = items.filter((i) => !i.done).length;
  if (remaining === 0) return null;

  return (
    <div
      className={cn(
        "mb-6 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/80 via-white to-amber-50/40 px-4 py-4 shadow-sm sm:px-5",
        className,
      )}
    >
      <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-sky-900/75">
        Finish your brand setup
      </p>
      <p className="mt-1 text-[13px] text-sky-950/80">
        {remaining} step{remaining === 1 ? "" : "s"} left so we can compare you to competitors across all channels.
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onNavigate(item.tab, item.sub ?? null)}
              className="flex w-full items-center gap-3 rounded-xl border border-sky-100/90 bg-white/80 px-3 py-2.5 text-left transition hover:border-sky-200 hover:bg-white"
            >
              {item.done ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-sky-950">{item.label}</span>
                <span className="block text-[11px] text-sky-900/60">{item.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
