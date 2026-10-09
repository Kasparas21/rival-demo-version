"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RecommendationsView } from "@/lib/competitor-recommendations/store";

export type RecommendationsState = RecommendationsView & { ok?: boolean; error?: string };
export type RecommendedCompetitor = RecommendationsView["recommendations"][number];

const POLL_MS = 5_000;
/** Stop polling a run that should long have finished; the server marks it failed after 10 minutes. */
const MAX_POLL_MS = 11 * 60 * 1000;

/**
 * The cached recommended competitors for a brand's website, polled while a run is going. `autoStart`
 * begins a run when none exists; otherwise `start` does.
 */
export function useCompetitorRecommendations({
  brandId,
  domain,
  autoStart = false,
}: {
  brandId: string;
  /** The site to use instead of the brand's saved one: onboarding, before the site is saved. */
  domain?: string;
  autoStart?: boolean;
}) {
  const [view, setView] = useState<RecommendationsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollStartedRef = useRef<number | null>(null);
  const autoStartedRef = useRef(false);

  const load = useCallback(
    async (method: "GET" | "POST") => {
      const params = new URLSearchParams({ brandId, ...(domain ? { domain } : {}) });
      const res = await fetch(
        method === "GET" ? `/api/competitor-recommendations?${params.toString()}` : "/api/competitor-recommendations",
        {
          method,
          credentials: "include",
          headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
          body: method === "POST" ? JSON.stringify({ brandId, domain }) : undefined,
        },
      );
      const data = (await res.json().catch(() => ({}))) as RecommendationsState;
      if (!res.ok || data.ok === false) throw new Error(data.error || "Couldn't load recommendations");
      return data;
    },
    [brandId, domain],
  );

  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      setView(await load("POST"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the search");
    } finally {
      setStarting(false);
    }
  }, [load]);

  // A different brand or site starts from scratch (set during render, not in an effect).
  const siteKey = `${brandId}|${domain ?? ""}`;
  const [loadedKey, setLoadedKey] = useState(siteKey);
  if (loadedKey !== siteKey) {
    setLoadedKey(siteKey);
    setView(null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    autoStartedRef.current = false;
    load("GET")
      .then((v) => {
        if (cancelled) return;
        setView(v);
        if (autoStart && (v.status === "none" || v.status === "failed") && !autoStartedRef.current) {
          autoStartedRef.current = true;
          void start();
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load recommendations"));
    return () => {
      cancelled = true;
    };
  }, [load, autoStart, start]);

  useEffect(() => {
    if (view?.status !== "running") {
      pollStartedRef.current = null;
      return;
    }
    pollStartedRef.current ??= Date.now();
    if (Date.now() - pollStartedRef.current > MAX_POLL_MS) return;
    const t = setTimeout(() => {
      load("GET")
        .then(setView)
        .catch(() => setView((v) => (v ? { ...v } : v))); // keep polling through a blip
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [view, load]);

  return { view, error, starting, start };
}

export function faviconFor(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}
