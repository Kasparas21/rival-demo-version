"use client";

import { cn } from "@/lib/utils";

/** Frosted glass surfaces for Autopilot modal */
export const autopilotGlassCardClass =
  "rounded-2xl border border-white/70 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_32px_-12px_rgba(31,38,135,0.12)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/50 transition-all duration-200";

export const autopilotGlassCardActiveClass =
  "border-emerald-300/60 bg-emerald-50/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_28px_-10px_rgba(16,185,129,0.2)] ring-emerald-200/50";

export const autopilotGlassInputClass =
  "w-full rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-[13px] text-[#1a1a2e] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none backdrop-blur-sm transition placeholder:text-[#a1a1aa] focus:border-indigo-300/70 focus:bg-white/70 focus:ring-2 focus:ring-indigo-400/20";

export function GlassSection({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <div>
        <h3 className="text-[13px] font-semibold tracking-tight text-[#1a1a2e]">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[11px] leading-relaxed text-[#71717a]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function GlassToggle({
  enabled,
  disabled,
  onChange,
  id,
  size = "md",
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  size?: "sm" | "md";
}) {
  const w = size === "sm" ? "w-[36px]" : "w-[40px]";
  const h = size === "sm" ? "h-[20px]" : "h-[22px]";
  const dot = size === "sm" ? "h-[16px] w-[16px]" : "h-[18px] w-[18px]";
  const translate = enabled ? (size === "sm" ? "translate-x-[16px]" : "translate-x-[18px]") : "translate-x-0";

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full p-[2px] transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-45",
        w,
        h,
        enabled
          ? "bg-gradient-to-b from-emerald-400 to-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
          : "bg-[#e5e7eb]/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          dot,
          translate,
        )}
      />
    </button>
  );
}

export function ChannelBrandIcon({
  channel,
  className,
}: {
  channel: "email" | "slack" | "discord";
  className?: string;
}) {
  if (channel === "email") {
    return (
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#4f46e5] shadow-[0_4px_12px_-4px_rgba(99,102,241,0.45)] ring-1 ring-white/40",
          className,
        )}
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-white" fill="none" aria-hidden>
          <path
            d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (channel === "slack") {
    return (
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4A154B] shadow-[0_4px_12px_-4px_rgba(74,21,75,0.5)] ring-1 ring-white/30",
          className,
        )}
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
          <path
            fill="#E01E5A"
            d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z"
          />
          <path
            fill="#36C5F0"
            d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z"
          />
          <path
            fill="#2EB67D"
            d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.528 2.528 0 01-2.52-2.521V2.522A2.528 2.528 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312z"
          />
          <path
            fill="#ECB22E"
            d="M15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.528 2.528 0 01-2.523-2.522v-2.522h2.523zm0-1.27a2.528 2.528 0 01-2.523-2.523 2.528 2.528 0 012.523-2.52h6.312A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.313z"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5865F2] shadow-[0_4px_12px_-4px_rgba(88,101,242,0.5)] ring-1 ring-white/35",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-white" aria-hidden>
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037 12.3 12.3 0 00-.608 1.25 18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    </span>
  );
}
