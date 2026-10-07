"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import type { AdAccountDiscovery } from "@/lib/ad-account-discovery/discover";
import type { AccountRole, Evidence, GoogleAdvertiserCandidate, MetaPageCandidate } from "@/lib/ad-account-discovery/score";
import { buildMetaAdLibraryUrl } from "@/lib/ad-library/canonical-library-url";

export type PickedAdAccounts = {
  /** Facebook page id; null when the user chose none of the found pages. */
  metaPageId?: string | null;
  /** Google Transparency advertiser id (AR…); null for none. */
  googleAdvertiserId?: string | null;
};

type Option = {
  id: string;
  name: string;
  role: AccountRole;
  confidence: "high" | "medium" | "low";
  evidence: Evidence[];
  preselected: boolean;
  detail: string | null;
  href: string;
};

const ROLE_LABEL: Partial<Record<AccountRole, string>> = {
  brand: "Their account",
  country: "Another country",
  possible: "Not sure",
  partner: "Partner or reseller",
};

const EVIDENCE_DOT: Record<Evidence["strength"], string> = {
  strong: "bg-emerald-500",
  medium: "bg-emerald-300",
  weak: "bg-gray-300",
  against: "bg-amber-400",
};

const CACHE_PREFIX = "rival_ad_accounts:";

function metaOptions(list: MetaPageCandidate[]): Option[] {
  return list.map((c) => ({
    id: c.pageId,
    name: c.pageName,
    role: c.role,
    confidence: c.confidence,
    evidence: c.evidence,
    preselected: c.preselected,
    detail: [
      `${c.adsSeen} active ad${c.adsSeen === 1 ? "" : "s"} seen`,
      c.linkHosts[0] ? `links to ${c.linkHosts[0].host}` : null,
      c.countries.length ? `targets ${c.countries.slice(0, 4).join(", ")}${c.countries.length > 4 ? "…" : ""}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    href: buildMetaAdLibraryUrl(c.pageId),
  }));
}

function googleOptions(list: GoogleAdvertiserCandidate[]): Option[] {
  return list.map((c) => ({
    id: c.advertiserId,
    name: c.advertiserName,
    role: c.role,
    confidence: c.confidence,
    evidence: c.evidence,
    preselected: c.preselected,
    detail: null,
    href: `https://adstransparency.google.com/advertiser/${c.advertiserId}`,
  }));
}

function readCache(domain: string): AdAccountDiscovery | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + domain);
    return raw ? (JSON.parse(raw) as AdAccountDiscovery) : null;
  } catch {
    return null;
  }
}

function writeCache(domain: string, data: AdAccountDiscovery) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + domain, JSON.stringify(data));
  } catch {
    /* storage full or blocked: the lookup just runs again next time */
  }
}

/**
 * Lists the ad accounts found for a competitor's website, with the evidence for each, and lets the user pick
 * one per platform (a brand can run a separate page per country). The choice fills the profile form below.
 */
export function AdAccountPicker({
  domain,
  brandName,
  market,
  platforms,
  onPick,
}: {
  domain: string;
  brandName?: string | null;
  market?: string | null;
  platforms: { meta: boolean; google: boolean };
  onPick: (picked: PickedAdAccounts) => void;
}) {
  const [data, setData] = useState<AdAccountDiscovery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metaChoice, setMetaChoice] = useState<string | null>(null);
  const [googleChoice, setGoogleChoice] = useState<string | null>(null);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    const apply = (d: AdAccountDiscovery) => {
      setData(d);
      const meta = d.meta.find((c) => c.preselected)?.pageId ?? null;
      const google = d.google.find((c) => c.preselected)?.advertiserId ?? null;
      setMetaChoice(meta);
      setGoogleChoice(google);
      onPickRef.current({
        ...(platforms.meta && meta ? { metaPageId: meta } : {}),
        ...(platforms.google && google ? { googleAdvertiserId: google } : {}),
      });
      setLoading(false);
    };
    const cached = readCache(domain);
    if (cached) {
      apply(cached);
      return;
    }
    void (async () => {
      try {
        const res = await fetch("/api/discover/ad-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: domain, brandName, market }),
        });
        const json = (await res.json()) as { ok: boolean; error?: string } & Partial<AdAccountDiscovery>;
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.meta || !json.google) throw new Error(json.error || "Lookup failed");
        const result: AdAccountDiscovery = {
          host: json.host ?? domain,
          brandName: json.brandName ?? "",
          meta: json.meta,
          google: json.google,
          linkedPagesWithoutAds: json.linkedPagesWithoutAds ?? [],
          failed: json.failed ?? [],
        };
        writeCache(domain, result);
        apply(result);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Lookup failed");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // One lookup per domain; brand name, market and platforms only shape that first request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  if (!platforms.meta && !platforms.google) return null;

  return (
    <div className="mx-auto mb-6 w-full max-w-2xl px-2 sm:px-0">
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <h3 className="text-[15px] font-bold text-[#343434]">Ad accounts advertising {domain}</h3>
        <p className="mt-0.5 text-[12px] leading-snug text-[#6b7280]">
          Found from the ads themselves: who paid for them and where they link. Pick the account to track; the
          profile fields below fill in.
        </p>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-[13px] text-[#6b7280]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Checking Meta and Google ad libraries… this takes up to a minute.
          </div>
        ) : error ? (
          <p className="mt-3 text-[13px] text-[#9f1239]">Couldn&apos;t look up ad accounts ({error}). Enter them below instead.</p>
        ) : data ? (
          <div className="mt-4 flex flex-col gap-5">
            {platforms.meta ? (
              <PlatformChoices
                title="Meta (Facebook & Instagram)"
                options={metaOptions(data.meta)}
                failed={data.failed.includes("meta")}
                emptyNote={
                  data.linkedPagesWithoutAds.length
                    ? `The website links to ${data.linkedPagesWithoutAds.join(", ")}, which has no active ads right now.`
                    : null
                }
                value={metaChoice}
                onChange={(id) => {
                  setMetaChoice(id);
                  onPick({ metaPageId: id });
                }}
              />
            ) : null}
            {platforms.google ? (
              <PlatformChoices
                title="Google Ads"
                options={googleOptions(data.google)}
                failed={data.failed.includes("google")}
                emptyNote={null}
                value={googleChoice}
                onChange={(id) => {
                  setGoogleChoice(id);
                  onPick({ googleAdvertiserId: id });
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlatformChoices({
  title,
  options,
  failed,
  emptyNote,
  value,
  onChange,
}: {
  title: string;
  options: Option[];
  failed: boolean;
  emptyNote: string | null;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const main = options.filter((o) => o.role === "brand" || o.role === "country" || o.role === "possible");
  const partners = options.filter((o) => o.role === "partner");
  const hiddenCount = options.filter((o) => o.role === "other").length;
  const name = `pick-${title}`;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-[13px] font-semibold text-[#343434]">{title}</legend>
      {failed ? (
        <p className="text-[12px] text-[#9f1239]">The lookup failed. Enter the account below.</p>
      ) : main.length === 0 && partners.length === 0 ? (
        <p className="text-[12px] text-[#6b7280]">
          No account with active ads for this site.{emptyNote ? ` ${emptyNote}` : ""} Enter it below if you know it.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {main.map((o) => (
            <Choice key={o.id} option={o} name={name} checked={value === o.id} onSelect={() => onChange(o.id)} />
          ))}
          {partners.length > 0 ? (
            <details className="group rounded-lg">
              <summary className="cursor-pointer select-none list-none text-[12px] font-medium text-[#6b7280] hover:text-[#343434] [&::-webkit-details-marker]:hidden">
                <span className="mr-1 inline-block text-[10px] transition-transform group-open:rotate-90" aria-hidden>
                  ▸
                </span>
                {partners.length} other advertiser{partners.length === 1 ? "" : "s"} linking to this site (partners,
                resellers)
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                {partners.map((o) => (
                  <Choice key={o.id} option={o} name={name} checked={value === o.id} onSelect={() => onChange(o.id)} />
                ))}
              </div>
            </details>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 px-1 text-[12px] text-[#6b7280]">
            <input type="radio" name={name} checked={value == null} onChange={() => onChange(null)} />
            None of these, I&apos;ll enter it myself
          </label>
          {hiddenCount > 0 ? (
            <p className="px-1 text-[11px] text-[#9ca3af]">
              {hiddenCount} unrelated advertiser{hiddenCount === 1 ? "" : "s"} left out.
            </p>
          ) : null}
        </div>
      )}
    </fieldset>
  );
}

function Choice({ option, name, checked, onSelect }: { option: Option; name: string; checked: boolean; onSelect: () => void }) {
  const label = ROLE_LABEL[option.role];
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        checked ? "border-[#343434] bg-gray-50" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="mt-1 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-semibold text-[#0f172a]">{option.name}</span>
          {label ? (
            <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-[#6b7280]">
              {label}
            </span>
          ) : null}
          <a
            href={option.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-0.5 text-[11px] text-[#6b7280] underline-offset-2 hover:underline"
          >
            View ads <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
        {option.detail ? <p className="mt-0.5 text-[12px] text-[#6b7280]">{option.detail}</p> : null}
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {option.evidence.map((e) => (
            <li key={e.text} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-[#4b5563]">
              <span className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${EVIDENCE_DOT[e.strength]}`} aria-hidden />
              {e.text}
            </li>
          ))}
        </ul>
      </div>
    </label>
  );
}
