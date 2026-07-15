"use client";

import { useCallback, useEffect, useState } from "react";

import type { SavedAdRow } from "@/components/ads-library/saved-ads-panel";
import type { SavedEmailRow } from "@/lib/saved-emails/snapshot";

export type SavedHubCounts = {
  ads: number;
  emails: number;
  organic: number;
  landings: number;
  total: number;
};

export type SavedHubCapabilities = {
  ads: boolean;
  emails: boolean;
  organic: boolean;
  landings: boolean;
};

export type SavedHubTab = "all" | "ads" | "emails" | "organic" | "landings";

export type SavedOrganicPostRow = {
  id: string;
  source_organic_post_id: string | null;
  platform: string;
  post_id: string | null;
  content: string | null;
  media_urls: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  posted_at: string | null;
  post_url: string | null;
  product_type: string | null;
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  saved_at: string;
};

export type SavedLandingPageRow = {
  id: string;
  source_landing_page_id: string | null;
  url: string;
  label: string;
  page_type: string | null;
  screenshot_url: string | null;
  hero_screenshot_url: string | null;
  saved_at: string;
};

type SavedItemsResponse = {
  ok?: boolean;
  error?: string;
  savedAds?: SavedAdRow[];
  savedEmails?: SavedEmailRow[];
  savedOrganicPosts?: SavedOrganicPostRow[];
  savedLandingPages?: SavedLandingPageRow[];
  counts?: SavedHubCounts;
  capabilities?: SavedHubCapabilities;
};

const EMPTY_COUNTS: SavedHubCounts = { ads: 0, emails: 0, organic: 0, landings: 0, total: 0 };

export function useCompetitorSavedHub(
  competitorId: string,
  enabled: boolean,
  seedTotal = 0,
) {
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAds, setSavedAds] = useState<SavedAdRow[]>([]);
  const [savedEmails, setSavedEmails] = useState<SavedEmailRow[]>([]);
  const [savedOrganicPosts, setSavedOrganicPosts] = useState<SavedOrganicPostRow[]>([]);
  const [savedLandingPages, setSavedLandingPages] = useState<SavedLandingPageRow[]>([]);
  const [counts, setCounts] = useState<SavedHubCounts>(EMPTY_COUNTS);
  const [capabilities, setCapabilities] = useState<SavedHubCapabilities>({
    ads: true,
    emails: true,
    organic: true,
    landings: true,
  });
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !competitorId.trim()) return;
    let cancelled = false;
    const expectItems = seedTotal > 0;
    if (expectItems) {
      setLoading(true);
    }
    setError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/saved-items?competitorId=${encodeURIComponent(competitorId)}`,
          { credentials: "include" },
        );
        const json = (await res.json()) as SavedItemsResponse;
        if (cancelled) return;
        if (!json.ok) {
          throw new Error(json.error ?? "Failed to load saved items");
        }
        setSavedAds(json.savedAds ?? []);
        setSavedEmails(json.savedEmails ?? []);
        setSavedOrganicPosts(json.savedOrganicPosts ?? []);
        setSavedLandingPages(json.savedLandingPages ?? []);
        setCounts(json.counts ?? EMPTY_COUNTS);
        setCapabilities(
          json.capabilities ?? { ads: true, emails: true, organic: true, landings: true },
        );
        setHasLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load saved items");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [competitorId, enabled, revision, seedTotal]);

  return {
    loading,
    hasLoaded,
    error,
    savedAds,
    savedEmails,
    savedOrganicPosts,
    savedLandingPages,
    counts,
    capabilities,
    refresh,
    setSavedAds,
    setSavedEmails,
    setSavedOrganicPosts,
    setSavedLandingPages,
    setCounts,
  };
}
