import type { Json } from "@/lib/supabase/types";

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
  /** Persisted competitor row scraped as workspace brand (never shown in sidebar; excluded from competitor limits). */
  isWorkspaceBrand?: boolean;
};

export type SavedSearchPayload = {
  query: string;
  terms?: Json;
  channels?: string[];
};
