import type { FunnelStage } from "@/lib/strategy-overview/payload-types";

export function strategyMapNodeSize(adCount: number, maxAdCount: number): { width: number; height: number } {
  const max = Math.max(1, maxAdCount);
  const t = Math.min(1, Math.max(0.15, adCount / max));
  const width = Math.round(168 + t * 112);
  const height = Math.round(128 + t * 88);
  return { width, height };
}

export const STAGE_THEME: Record<
  FunnelStage,
  {
    border: string;
    bg: string;
    badge: string;
    adText: string;
    subtle: string;
    glow: string;
  }
> = {
  TOF: {
    border: "#3b82f6",
    bg: "linear-gradient(145deg, #eff6ff 0%, #dbeafe 55%, #bfdbfe 100%)",
    badge: "bg-blue-600 text-white border-blue-500",
    adText: "text-blue-700",
    subtle: "text-blue-900/70",
    glow: "0 12px 40px rgba(59, 130, 246, 0.22)",
  },
  MOF: {
    border: "#f59e0b",
    bg: "linear-gradient(145deg, #fffbeb 0%, #fef3c7 55%, #fde68a 100%)",
    badge: "bg-amber-500 text-white border-amber-400",
    adText: "text-amber-700",
    subtle: "text-amber-950/75",
    glow: "0 12px 40px rgba(245, 158, 11, 0.2)",
  },
  BOF: {
    border: "#10b981",
    bg: "linear-gradient(145deg, #ecfdf5 0%, #d1fae5 55%, #a7f3d0 100%)",
    badge: "bg-emerald-600 text-white border-emerald-500",
    adText: "text-emerald-700",
    subtle: "text-emerald-950/75",
    glow: "0 12px 40px rgba(16, 185, 129, 0.2)",
  },
};

export function activityIntensity(adCount: number, maxAdCount: number): number {
  const max = Math.max(1, maxAdCount);
  return Math.min(1, Math.max(0.2, adCount / max));
}

export function activityLevelLabel(adCount: number, maxAdCount: number): string {
  const max = Math.max(1, maxAdCount);
  if (max <= 0 || adCount <= 0) return "Very Low";
  const r = adCount / max;
  if (r >= 0.85) return "Very High";
  if (r >= 0.55) return "High";
  if (r >= 0.3) return "Medium";
  if (r >= 0.12) return "Low";
  return "Very Low";
}

/** Visual parity with funnel cells — distinct violet / amber channel identity. */
export const CHANNEL_ORGANIC_THEME = {
  border: "#7c3aed",
  bg: "linear-gradient(145deg, #f5f3ff 0%, #ede9fe 52%, #ddd6fe 100%)",
  badge: "bg-violet-600 text-white border-violet-500",
  metricText: "text-violet-800",
  subtle: "text-violet-950/75",
  glow: "0 12px 36px rgba(124, 58, 237, 0.22)",
};

export const CHANNEL_EMAIL_THEME = {
  border: "#d97706",
  bg: "linear-gradient(145deg, #fffbeb 0%, #fef3c7 52%, #fde68a 100%)",
  badge: "bg-amber-600 text-white border-amber-500",
  metricText: "text-amber-800",
  subtle: "text-amber-950/75",
  glow: "0 12px 36px rgba(217, 119, 6, 0.2)",
};

export const JOURNEY_GOAL_THEME = {
  border: "#be123c",
  ring: "rgba(225, 29, 72, 0.35)",
  bg: "radial-gradient(ellipse at 50% 0%, #fff1f2 0%, #ffe4e6 45%, #fda4af 100%)",
  core: "#e11d48",
  coreGlow: "0 0 0 6px rgba(254, 205, 211, 0.9), 0 8px 28px rgba(225, 29, 72, 0.35)",
  metricText: "text-rose-950",
  subtle: "text-rose-900/70",
  chip: "bg-white/90 text-rose-800 ring-1 ring-rose-200/80",
  glow: "0 16px 48px rgba(225, 29, 72, 0.28)",
};
