"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Loader2, Plus, RefreshCw, Sparkles } from "lucide-react";

import type { RecommendationsView } from "@/lib/competitor-recommendations/store";
import type { RecommendationGroup } from "@/lib/competitor-recommendations/types";

type View = RecommendationsView & { ok?: boolean; error?: string };
type Item = RecommendationsView["recommendations"][number];

const POLL_MS = 5_000;
/** Stop polling a run that should long have finished; the server marks it failed after 10 minutes. */
const MAX_POLL_MS = 11 * 60 * 1000;

const GROUP_LABEL: Record<RecommendationGroup, string> = {
  best_to_copy: "A step ahead",
  leader: "Market leader",
  peer: "Close peer",
  smaller_sharp: "Smaller, advertising hard",
};

const GROUP_STYLE: Record<RecommendationGroup, string> = {
  best_to_copy: "bg-[#e8f5ee] text-[#1f7a4d]",
  leader: "bg-[#eef0ff] text-[#3b45a8]",
  peer: "bg-[#f1f1f3] text-[#52525b]",
  smaller_sharp: "bg-[#fff4e5] text-[#a15c00]",
};

/** Where they were searched: the city for local businesses, else the country. */
function market(view: View): string | null {
  const p = view.profile;
  if (!p) return null;
  if (p.businessType === "local" && p.city) return p.city;
  if (!p.country) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(p.country) ?? p.country;
  } catch {
    return p.country;
  }
}

function signals(item: Item): string[] {
  const out: string[] = [];
  const ads = item.size.metaAds;
  if (ads != null) out.push(ads >= 10 ? "10+ active Meta ads" : ads > 0 ? `${ads} active Meta ads` : "No Meta ads found");
  const reviews = item.size.reviewsCount ?? item.reviewsCount;
  if (reviews != null) out.push(`${reviews} Google reviews${item.rating ? ` · ${item.rating.toFixed(1)}★` : ""}`);
  return out;
}

function CompetitorCard({
  item,
  tracked,
  onTrack,
  compact,
}: {
  item: Item;
  tracked: boolean;
  onTrack?: (domain: string) => void;
  compact: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/55 p-4 text-left shadow-[0_4px_16px_rgba(31,38,135,0.05)]">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.domain)}&sz=64`}
          alt=""
          className="mt-0.5 size-8 shrink-0 rounded-lg bg-white object-contain p-1 ring-1 ring-black/5"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#343434]" title={item.name}>
            {item.name}
          </p>
          <a
            href={`https://${item.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[13px] font-medium text-[#808080] hover:text-[#343434]"
          >
            {item.domain}
            <ArrowUpRight className="size-3" aria-hidden />
          </a>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${GROUP_STYLE[item.group]}`}>
          {GROUP_LABEL[item.group]}
        </span>
      </div>

      {item.edge ? (
        <p className="text-[13px] leading-snug text-[#3f3f46]">
          <span className="font-semibold text-[#343434]">What they do well: </span>
          {item.edge}
        </p>
      ) : null}
      {!compact && item.evidence[0] ? (
        <p className="text-[12px] leading-snug text-[#71717a]">
          <span className="font-medium">Why they compete: </span>
          {item.evidence[0]}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {signals(item).map((s) => (
          <span key={s} className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-[#71717a] ring-1 ring-black/5">
            {s}
          </span>
        ))}
        {onTrack ? (
          tracked ? (
            <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-[#1f7a4d]">
              <Check className="size-3.5" aria-hidden /> Tracking
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onTrack(item.domain)}
              className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#343434] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#2a2a2a]"
            >
              <Plus className="size-3.5" aria-hidden /> Track
            </button>
          )
        ) : null}
      </div>
    </li>
  );
}

/**
 * Direct competitors worth learning from, found from the brand's website. One cached run per website:
 * `autoStart` begins it when none exists; otherwise the user starts it.
 */
export function RecommendedCompetitors({
  brandId,
  domain,
  limit,
  autoStart = false,
  trackedDomains,
  onTrack,
  title = "Recommended competitors",
  compact = false,
}: {
  brandId: string;
  /** The site to use instead of the brand's saved one: onboarding, before the site is saved. */
  domain?: string;
  limit?: number;
  autoStart?: boolean;
  trackedDomains?: ReadonlySet<string>;
  onTrack?: (domain: string) => void;
  title?: string;
  compact?: boolean;
}) {
  const [view, setView] = useState<View | null>(null);
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
      const data = (await res.json().catch(() => ({}))) as View;
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
        if (autoStart && v.status === "none" && !autoStartedRef.current) {
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

  const shown = limit ? (view?.recommendations ?? []).slice(0, limit) : (view?.recommendations ?? []);

  return (
    <section className="w-full text-left" aria-live="polite">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[#808080]">
          <Sparkles className="size-4" aria-hidden />
          {title}
        </h2>
        {!compact && view?.status === "done" && view.finishedAt ? (
          <span className="text-[11px] font-medium text-[#a1a1aa]">
            Checked {view.checked} sites · {new Date(view.finishedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-white/60 bg-white/50 p-4 text-[14px] text-[#b42318]">
          {error}
          {view?.status !== "running" ? (
            <button type="button" onClick={() => void start()} className="ml-2 cursor-pointer font-semibold underline">
              Try again
            </button>
          ) : null}
        </div>
      ) : !view ? (
        <div className="h-24 animate-pulse rounded-2xl bg-white/40" />
      ) : view.status === "none" ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/60 bg-white/50 p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-[14px] leading-snug text-[#52525b]">
            We&apos;ll read your website, search for businesses selling the same thing to the same customers, check
            each one&apos;s site, and pick the ones worth learning from. Takes about a minute.
          </p>
          <button
            type="button"
            disabled={starting}
            onClick={() => void start()}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-[18px] bg-[#343434] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
          >
            {starting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            Find my competitors
          </button>
        </div>
      ) : view.status === "running" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 p-5 text-[14px] text-[#52525b]">
          <Loader2 className="size-5 shrink-0 animate-spin text-[#808080]" aria-hidden />
          <p>
            Finding competitors for <span className="font-semibold">{view.domain}</span>: reading their sites and checking
            who really sells the same thing. This takes a minute or two{compact ? "; keep going, we'll show them here." : "."}
          </p>
        </div>
      ) : view.status === "failed" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 p-5 text-[14px] text-[#52525b]">
          <p className="flex-1">The search didn&apos;t finish.</p>
          <button
            type="button"
            disabled={starting}
            onClick={() => void start()}
            className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-[#343434] disabled:opacity-60"
          >
            <RefreshCw className="size-4" aria-hidden /> Try again
          </button>
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-white/60 bg-white/50 p-5 text-[14px] text-[#52525b]">
          We couldn&apos;t find direct competitors we were sure about. Search for one by name above.
        </p>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-[#71717a]">
            Selling the same thing to the same customers as {view.profile?.brandName ?? view.domain}
            {market(view) ? ` (${market(view)})` : ""}. The ones most worth learning from come first.
          </p>
          <ul className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {shown.map((item) => (
              <CompetitorCard
                key={item.domain}
                item={item}
                tracked={trackedDomains?.has(item.domain) ?? false}
                onTrack={onTrack}
                compact={compact}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
