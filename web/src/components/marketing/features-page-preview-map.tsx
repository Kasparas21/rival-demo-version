"use client";

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

import { AdLibraryPreview } from "@/components/feature-previews/ad-library-preview";
import { ActivityScorePreview } from "@/components/feature-previews/activity-score-preview";
import { AudienceInferencePreview } from "@/components/feature-previews/audience-inference-preview";
import { CopyVaultPreview } from "@/components/feature-previews/copy-vault-preview";
import { MondayDigestPreview } from "@/components/feature-previews/monday-digest-preview";
import { PlatformPrioritizationPreview } from "@/components/feature-previews/platform-prioritization-preview";
import { StealableAnglesPreview } from "@/components/feature-previews/stealable-angles-preview";
import { StrategyMapPreview } from "@/components/feature-previews/strategy-map-preview";
import { ThreeMovesPreview } from "@/components/feature-previews/three-moves-preview";
import { TimelinePreview } from "@/components/feature-previews/timeline-preview";
import type { FeatureIconKey } from "@/components/marketing/features-page-data";

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
  "ad-library": AdLibraryPreview,
  "strategy-map": StrategyMapPreview,
  "three-moves": ThreeMovesPreview,
  "stealable-angles": StealableAnglesPreview,
  "copy-vault": CopyVaultPreview,
  timeline: TimelinePreview,
  "activity-score": ActivityScorePreview,
  "audience-inference": AudienceInferencePreview,
  "monday-digest": MondayDigestPreview,
  "platform-prioritization": PlatformPrioritizationPreview,
};
