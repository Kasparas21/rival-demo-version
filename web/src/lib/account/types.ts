import type { Json } from "@/lib/supabase/types";

/** Persisted with saved competitors for cross-device Ads Library (matches sidebar `libraryContext`). */
export type AdsLibraryContextPayload = {
  ids?: Record<string, string>;
  channels?: string[];
  confirmed?: boolean;
};

export type SavedCompetitorPayload = {
  slug: string;
  name: string;
  logoUrl?: string;
  brand?: {
    name: string;
    domain: string;
    logoUrl?: string;
  };
  pending?: boolean;
  lastScrapedAt?: string;
  /** Stored in `saved_competitors.ads_library_context`. `undefined` = keep existing on upsert; `null` = clear. */
  adsLibraryContext?: AdsLibraryContextPayload | null;
  /** Persisted competitor row scraped as workspace brand (never shown in sidebar; excluded from competitor limits). */
  isWorkspaceBrand?: boolean;
};

export type SavedSearchPayload = {
  query: string;
  terms?: Json;
  channels?: string[];
};
