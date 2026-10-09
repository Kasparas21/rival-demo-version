"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Loader2, Plus } from "lucide-react";

import {
  faviconFor,
  useCompetitorRecommendations,
} from "@/components/competitor-recommendations/use-competitor-recommendations";
import { registrableDomain } from "@/lib/ad-account-discovery/score";
import { readClientCompetitorSlotsRemaining, syncClientMaxWatchedCompetitorsFromUsage } from "@/lib/billing/client-plan-cap";
import { fillCopyTemplate } from "@/lib/i18n/fill-copy-template";
import type { OnboardingFormCopy } from "@/lib/i18n/onboarding/types";
import { hostToBrandLabel, isPlausiblePublicHostname, normalizedWorkspaceHost } from "@/lib/onboarding/host";

type Row = { domain: string; name: string };

/** Found rivals shown at first; the rest stay on Find competitor. */
const MAX_SHOWN = 6;
const PRESELECTED = 3;

function RivalRow({
  row,
  selected,
  disabled,
  onToggle,
}: {
  row: Row;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        disabled={disabled}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02] focus-visible:bg-black/[0.03] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={faviconFor(row.domain)}
          alt=""
          className="size-9 shrink-0 rounded-[9px] bg-white object-contain p-1.5 ring-1 ring-black/[0.06]"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">{row.name}</span>
          <span className="block truncate text-[13px] text-[#86868b]">{row.domain}</span>
        </span>
        <span
          aria-hidden
          className={`flex size-[22px] shrink-0 items-center justify-center rounded-full transition-colors ${
            selected ? "bg-[#1d1d1f] text-white" : "ring-[1.5px] ring-inset ring-[#d2d2d7]"
          }`}
        >
          {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
      </button>
    </li>
  );
}

/**
 * Onboarding: the rivals found from the user's website, top few picked already, plus any they add by
 * website. Continuing hands the picks on to be tracked once setup finishes.
 */
export function OnboardingRivalsStep({
  copy,
  domain,
  onContinue,
}: {
  copy: OnboardingFormCopy["rivals"];
  domain: string;
  onContinue: (domains: string[]) => void;
}) {
  const own = domain.includes(".") ? registrableDomain(domain) : domain;
  const { view, error, start } = useCompetitorRecommendations({ brandId: "_workspace", domain, autoStart: true });
  const [added, setAdded] = useState<Row[]>([]);
  /** Null until the user changes anything: then the top found rivals are picked by default. */
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [adding, setAdding] = useState(false);
  const [site, setSite] = useState("");
  const [siteError, setSiteError] = useState<string | null>(null);
  const [slotsLeft, setSlotsLeft] = useState<number | null>(null);

  useEffect(() => {
    void syncClientMaxWatchedCompetitorsFromUsage().then((cap) => setSlotsLeft(readClientCompetitorSlotsRemaining() ?? cap));
  }, []);

  const found = useMemo<Row[]>(
    () =>
      (view?.recommendations ?? [])
        .filter((r) => r.domain !== own)
        .slice(0, MAX_SHOWN)
        .map((r) => ({ domain: r.domain, name: r.name })),
    [view, own],
  );
  const rows = [...found, ...added.filter((a) => !found.some((f) => f.domain === a.domain))];
  const selected = picked ?? new Set(found.slice(0, Math.min(PRESELECTED, slotsLeft ?? PRESELECTED)).map((r) => r.domain));
  const atCap = slotsLeft != null && selected.size >= slotsLeft;

  const toggle = (d: string) => {
    const next = new Set(selected);
    if (next.has(d)) next.delete(d);
    else if (!atCap) next.add(d);
    setPicked(next);
  };

  const addSite = (e: FormEvent) => {
    e.preventDefault();
    const host = normalizedWorkspaceHost(site.trim().toLowerCase());
    if (!isPlausiblePublicHostname(host)) {
      setSiteError(copy.invalidSite);
      return;
    }
    const d = registrableDomain(host);
    if (d !== own && !rows.some((r) => r.domain === d)) {
      setAdded((prev) => [...prev, { domain: d, name: hostToBrandLabel(d) }]);
    }
    if (d !== own && !atCap) setPicked(new Set(selected).add(d));
    setSite("");
    setSiteError(null);
    setAdding(false);
  };

  const running = !error && (!view || view.status === "running" || view.status === "none");
  const count = selected.size;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">{copy.title}</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-gray-500">{copy.body}</p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.05]">
        {running ? (
          <div aria-live="polite">
            <p className="flex items-center gap-2 px-4 pt-4 pb-1 text-[13px] text-[#86868b]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {copy.loading}
            </p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
                <div className="size-9 animate-pulse rounded-[9px] bg-[#f2f2f4]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 animate-pulse rounded bg-[#f2f2f4]" />
                  <div className="h-2.5 w-44 animate-pulse rounded bg-[#f5f5f7]" />
                </div>
              </div>
            ))}
          </div>
        ) : error || view?.status === "failed" ? (
          <p className="flex items-center gap-3 px-4 py-4 text-[13px] text-[#6e6e73]">
            <span className="flex-1">{copy.failed}</span>
            <button type="button" onClick={() => void start()} className="cursor-pointer font-semibold text-[#0066cc] hover:underline">
              {copy.retry}
            </button>
          </p>
        ) : found.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-[#6e6e73]">{copy.empty}</p>
        ) : null}

        {rows.length > 0 ? (
          <ul className={`divide-y divide-black/[0.06] ${running ? "border-t border-black/[0.06]" : ""}`}>
            {rows.map((row) => (
              <RivalRow
                key={row.domain}
                row={row}
                selected={selected.has(row.domain)}
                disabled={!selected.has(row.domain) && atCap}
                onToggle={() => toggle(row.domain)}
              />
            ))}
          </ul>
        ) : null}

        <div className="border-t border-black/[0.06]">
          {adding ? (
            <form onSubmit={addSite} noValidate className="flex items-center gap-2 px-4 py-3">
              <input
                autoFocus
                value={site}
                onChange={(e) => {
                  setSite(e.target.value);
                  if (siteError) setSiteError(null);
                }}
                onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                placeholder={copy.addPlaceholder}
                aria-label={copy.addLabel}
                aria-invalid={siteError ? true : undefined}
                type="url"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-lg bg-[#f5f5f7] px-3 py-2 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
              />
              <button
                type="submit"
                className="shrink-0 cursor-pointer rounded-full bg-[#1d1d1f] px-4 py-2 text-[13px] font-semibold text-white hover:bg-black"
              >
                {copy.add}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left text-[15px] font-medium text-[#0066cc] transition-colors hover:bg-black/[0.02]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[#f5f5f7]">
                <Plus className="size-4" strokeWidth={2.5} aria-hidden />
              </span>
              {copy.addLabel}
            </button>
          )}
          {siteError ? <p className="px-4 pb-3 text-[13px] text-[#b42318]">{siteError}</p> : null}
        </div>
      </div>

      {atCap && slotsLeft != null ? (
        <p className="mt-3 text-[13px] text-[#86868b]">{fillCopyTemplate(copy.capReached, { count: String(slotsLeft) })}</p>
      ) : null}

      <button
        type="button"
        disabled={count === 0}
        onClick={() => onContinue([...selected])}
        className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        {count === 1 ? copy.trackOne : fillCopyTemplate(copy.trackMany, { count: String(count) })}
      </button>
      <button
        type="button"
        onClick={() => onContinue([])}
        className="mt-3 w-full cursor-pointer py-1.5 text-[14px] font-medium text-[#6e6e73] hover:text-[#1d1d1f]"
      >
        {copy.skip}
      </button>
    </div>
  );
}
