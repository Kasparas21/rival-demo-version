"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Loader2, Plus } from "lucide-react";

import {
  faviconFor,
  useCompetitorRecommendations,
} from "@/components/competitor-recommendations/use-competitor-recommendations";
import { registrableDomain } from "@/lib/ad-account-discovery/score";
import { readClientCompetitorSlotsRemaining, syncClientMaxWatchedCompetitorsFromUsage } from "@/lib/billing/client-plan-cap";
import { glassInputClass } from "@/components/ui/glass-styles";
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
        className={`flex w-full cursor-pointer items-center gap-3.5 rounded-xl border px-3.5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
          selected
            ? "border-[#4a7fa5]/35 bg-white/55 shadow-sm ring-1 ring-[#4a7fa5]/25"
            : "border-gray-200/70 bg-white/30 hover:border-gray-300/80 hover:bg-white/45"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={faviconFor(row.domain)}
          alt=""
          className="size-9 shrink-0 rounded-lg border border-white/60 bg-white/70 object-contain p-1.5"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-gray-900">{row.name}</span>
          <span className="block truncate text-[13px] text-gray-500">{row.domain}</span>
        </span>
        <span
          aria-hidden
          className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition ${
            selected ? "border-[#1a1a2e] bg-[#1a1a2e] text-white" : "border-gray-300/80 bg-white/60"
          }`}
        >
          {selected ? <Check className="size-3.5" strokeWidth={2.75} /> : null}
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
        <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600">{copy.body}</p>
      </div>

      {running ? (
        <p className="mb-3 flex items-center gap-2 text-[13px] text-gray-500" aria-live="polite">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {copy.loading}
        </p>
      ) : error || view?.status === "failed" ? (
        <p className="mb-3 flex items-center gap-3 text-[13px] text-gray-600">
          <span className="flex-1">{copy.failed}</span>
          <button type="button" onClick={() => void start()} className="cursor-pointer font-semibold text-gray-900 underline">
            {copy.retry}
          </button>
        </p>
      ) : found.length === 0 ? (
        <p className="mb-3 text-[13px] text-gray-600">{copy.empty}</p>
      ) : null}

      <ul className="space-y-2">
        {running && added.length === 0
          ? [0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3.5 rounded-xl border border-gray-200/60 bg-white/25 px-3.5 py-3">
                <div className="size-9 animate-pulse rounded-lg bg-white/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 animate-pulse rounded bg-white/70" />
                  <div className="h-2.5 w-40 animate-pulse rounded bg-white/50" />
                </div>
              </li>
            ))
          : null}
        {rows.map((row) => (
          <RivalRow
            key={row.domain}
            row={row}
            selected={selected.has(row.domain)}
            disabled={!selected.has(row.domain) && atCap}
            onToggle={() => toggle(row.domain)}
          />
        ))}
        <li>
          {adding ? (
            <form onSubmit={addSite} noValidate className="flex items-center gap-2">
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
                className={`${glassInputClass} min-w-0 flex-1`}
              />
              <button
                type="submit"
                className="shrink-0 cursor-pointer rounded-full bg-gray-900 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-black"
              >
                {copy.add}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl border border-dashed border-gray-300/80 bg-white/20 px-3.5 py-3 text-left text-[15px] font-medium text-gray-700 transition hover:border-gray-400/80 hover:bg-white/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/60 bg-white/50">
                <Plus className="size-4" strokeWidth={2.5} aria-hidden />
              </span>
              {copy.addLabel}
            </button>
          )}
          {siteError ? <p className="mt-2 text-[13px] text-[#b42318]">{siteError}</p> : null}
        </li>
      </ul>

      {atCap && slotsLeft != null ? (
        <p className="mt-3 text-[13px] text-gray-500">{fillCopyTemplate(copy.capReached, { count: String(slotsLeft) })}</p>
      ) : null}

      <button
        type="button"
        disabled={running && count === 0}
        onClick={() => onContinue([...selected])}
        className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        {count === 0 ? copy.continueWithout : count === 1 ? copy.trackOne : fillCopyTemplate(copy.trackMany, { count: String(count) })}
      </button>
    </div>
  );
}
