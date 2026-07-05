"use client";

import type { LucideIcon } from "lucide-react";

import { autopilotGlassCardClass, autopilotGlassInputClass } from "@/components/autopilot/autopilot-glass-ui";
import { glassModalShellClass, glassPillMaterialClass } from "@/components/ui/glass-styles";
import { cn } from "@/lib/utils";

export const settingsGlassInputClass = cn(autopilotGlassInputClass, "min-h-[44px] text-[14px]");

export const settingsGlassInputReadonlyClass = cn(
  settingsGlassInputClass,
  "cursor-not-allowed bg-white/30 text-[#52525b]",
);

const accentBlobs: Record<string, { a: string; b: string }> = {
  default: {
    a: "bg-indigo-400/12",
    b: "bg-sky-400/10",
  },
  emerald: {
    a: "bg-emerald-400/15",
    b: "bg-indigo-400/10",
  },
  indigo: {
    a: "bg-indigo-400/15",
    b: "bg-violet-400/10",
  },
  subscription: {
    a: "bg-indigo-400/18",
    b: "bg-sky-300/12",
  },
  danger: {
    a: "bg-red-400/10",
    b: "bg-rose-300/8",
  },
};

type SettingsGlassSectionProps = {
  icon?: LucideIcon;
  iconClassName?: string;
  accent?: keyof typeof accentBlobs;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  ringClassName?: string;
};

export function SettingsGlassSection({
  icon: Icon,
  iconClassName,
  accent = "default",
  title,
  subtitle,
  headerRight,
  children,
  className,
  ringClassName,
}: SettingsGlassSectionProps) {
  const blobs = accentBlobs[accent] ?? accentBlobs.default;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.35rem] p-5 sm:p-6",
        glassPillMaterialClass,
        ringClassName,
        className,
      )}
    >
      <div
        className={cn("pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl", blobs.a)}
        aria-hidden
      />
      <div
        className={cn("pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full blur-3xl", blobs.b)}
        aria-hidden
      />

      <div className="relative">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            {Icon ? (
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-indigo-900 text-white shadow-[0_8px_24px_-8px_rgba(26,26,46,0.55)] ring-1 ring-white/25",
                  iconClassName,
                )}
              >
                <Icon className="h-6 w-6" aria-hidden />
              </div>
            ) : null}
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-tight text-[#1a1a2e]">{title}</h2>
              {subtitle ? (
                <div className="mt-1 text-[13px] leading-relaxed text-[#71717a]">{subtitle}</div>
              ) : null}
            </div>
          </div>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function SettingsGlassStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: React.ReactNode;
}) {
  return (
    <div className={cn("px-4 py-3.5", autopilotGlassCardClass)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a1a1aa]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#1a1a2e]">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-[#71717a]">{hint}</p>
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "dangerGhost";

export function SettingsGlassButton({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" &&
          "bg-[#1a1a2e] text-white shadow-[0_6px_20px_-8px_rgba(26,26,46,0.5)] hover:bg-[#2d2d44]",
        variant === "secondary" &&
          "border border-white/70 bg-white/60 text-[#1a1a2e] shadow-sm backdrop-blur-sm hover:bg-white/85",
        variant === "danger" &&
          "border border-red-200/80 bg-red-50/55 text-red-700 backdrop-blur-sm hover:bg-red-50/80",
        variant === "dangerGhost" &&
          "border border-red-200/70 bg-white/50 text-red-700 backdrop-blur-sm hover:bg-red-50/60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SettingsGlassLinkButton({
  variant = "primary",
  className,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: "primary" | "secondary" }) {
  return (
    <a
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition active:scale-[0.98]",
        variant === "primary" &&
          "bg-[#1a1a2e] text-white shadow-[0_6px_20px_-8px_rgba(26,26,46,0.5)] hover:bg-[#2d2d44]",
        variant === "secondary" &&
          "border border-white/70 bg-white/60 text-[#1a1a2e] shadow-sm backdrop-blur-sm hover:bg-white/85",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

type BannerTone = "error" | "success" | "info" | "warning";

const bannerToneClass: Record<BannerTone, string> = {
  error: "border-red-200/70 bg-red-50/55 text-red-950",
  success: "border-emerald-200/70 bg-emerald-50/50 text-emerald-950",
  info: "border-sky-200/70 bg-sky-50/50 text-sky-950",
  warning: "border-amber-200/70 bg-amber-50/50 text-amber-950",
};

export function SettingsGlassBanner({
  tone,
  children,
  className,
}: {
  tone: BannerTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-[13px] leading-relaxed backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
        bannerToneClass[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsGlassInsetPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("rounded-2xl p-4", autopilotGlassCardClass, className)}>{children}</div>;
}

export function SettingsGlassModalShell({
  children,
  className,
  onBackdropClick,
  labelledBy,
}: {
  children: React.ReactNode;
  className?: string;
  onBackdropClick?: () => void;
  labelledBy?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/25 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn("w-full max-w-md p-6", glassModalShellClass, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function SettingsFieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-1.5 block text-[12px] font-semibold text-[#52525b]" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function SettingsFieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[11px] leading-relaxed text-[#a1a1aa]">{children}</p>;
}
