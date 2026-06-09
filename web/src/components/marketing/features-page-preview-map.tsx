"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import {
  BarChart3,
  BookOpen,
  Gauge,
  GitCompare,
  LayoutGrid,
  Mail,
  Map,
  SlidersHorizontal,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react";

import type { FeatureIconKey } from "@/components/marketing/features-page-data";

const previewFallback = () => (
  <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white/60">
    <p className="text-[12px] text-[#94a3b8]">Loading preview…</p>
  </div>
);

const lazyPreview = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, { ssr: false, loading: previewFallback });

export const FEATURE_ICON_MAP: Record<FeatureIconKey, LucideIcon> = {
  "layout-grid": LayoutGrid,
  map: Map,
  sparkles: Sparkles,
  "git-compare": GitCompare,
  "book-open": BookOpen,
  timer: Timer,
  gauge: Gauge,
  "bar-chart": BarChart3,
  mail: Mail,
  sliders: SlidersHorizontal,
};

export const FEATURE_PREVIEW_MAP: Record<string, ComponentType> = {
  "ad-library": lazyPreview(() =>
    import("@/components/feature-previews/ad-library-preview").then((m) => ({
      default: m.AdLibraryPreview,
    })),
  ),
  "strategy-map": lazyPreview(() =>
    import("@/components/feature-previews/strategy-map-preview").then((m) => ({
      default: m.StrategyMapPreview,
    })),
  ),
  "three-moves": lazyPreview(() =>
    import("@/components/feature-previews/three-moves-preview").then((m) => ({
      default: m.ThreeMovesPreview,
    })),
  ),
  "stealable-angles": lazyPreview(() =>
    import("@/components/feature-previews/stealable-angles-preview").then((m) => ({
      default: m.StealableAnglesPreview,
    })),
  ),
  "copy-vault": lazyPreview(() =>
    import("@/components/feature-previews/copy-vault-preview").then((m) => ({
      default: m.CopyVaultPreview,
    })),
  ),
  timeline: lazyPreview(() =>
    import("@/components/feature-previews/timeline-preview").then((m) => ({
      default: m.TimelinePreview,
    })),
  ),
  "activity-score": lazyPreview(() =>
    import("@/components/feature-previews/activity-score-preview").then((m) => ({
      default: m.ActivityScorePreview,
    })),
  ),
  "audience-inference": lazyPreview(() =>
    import("@/components/feature-previews/audience-inference-preview").then((m) => ({
      default: m.AudienceInferencePreview,
    })),
  ),
  "monday-digest": lazyPreview(() =>
    import("@/components/feature-previews/monday-digest-preview").then((m) => ({
      default: m.MondayDigestPreview,
    })),
  ),
  "platform-prioritization": lazyPreview(() =>
    import("@/components/feature-previews/platform-prioritization-preview").then((m) => ({
      default: m.PlatformPrioritizationPreview,
    })),
  ),
};
