import type { AdPreviewAnalysisQuota } from "@/components/ad-detail/ad-preview-analysis-panel";
import type { AdPreviewAnalysis } from "@/lib/ad-detail/ad-ai-analysis-types";
import type { CopyStructureResult } from "@/lib/comparison/copy-structure-types";
import type { Json } from "@/lib/supabase/types";

export type AdDetailDrawerPayload = {
  ok: boolean;
  error?: string;
  ad?: {
    id: string;
    display_label: string;
    platform: string;
    format: string;
    ad_creative_url: string | null;
    ad_text: string;
    cta: string | null;
    first_seen_at: string;
    last_seen_at: string;
    is_killed: boolean;
    lifespan_days: number;
    raw_payload: Json;
  };
  competitor?: {
    id: string;
    name: string;
    domain: string;
    logo_url: string | null;
    brand_context: string | null;
  };
  ai?: {
    angle: string | null;
    funnel_stage: string | null;
    voice_tone: unknown;
    launch_date: string | null;
    enrichment_status: string;
  };
  context?: {
    landing_page_url: string | null;
    landing_page_display: string | null;
    is_creative_test_winner: boolean;
    creative_test?: { launch_date: string; ad_count: number; test_status: string };
    copy_structure?: CopyStructureResult;
    preview_analysis?: AdPreviewAnalysis;
    preview_analysis_computed_at?: string | null;
    preview_analysis_quota?: AdPreviewAnalysisQuota;
  };
};

export type AdDetailData = NonNullable<
  Omit<AdDetailDrawerPayload, "ok" | "error"> & {
    ok: true;
    ad: NonNullable<AdDetailDrawerPayload["ad"]>;
    competitor: NonNullable<AdDetailDrawerPayload["competitor"]>;
    ai: NonNullable<AdDetailDrawerPayload["ai"]>;
    context: NonNullable<AdDetailDrawerPayload["context"]>;
  }
>;
