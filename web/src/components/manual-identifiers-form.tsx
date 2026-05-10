"use client";

import React, {
  useState,
  useRef,
  useLayoutEffect,
  useMemo,
  useCallback,
  useId,
  useEffect,
} from "react";
import { ExternalLink, HelpCircle, Info } from "lucide-react";
import { CHANNELS, type ChannelId } from "./channel-picker-modal";
import { googleFaviconUrlForDomain, brandSlugFromDomain } from "@/lib/discovery";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";
import type { AdLibraryRegionPrefs } from "@/lib/ad-library/ad-library-region-prefs";
import { buildGoogleAdsRegionOptions } from "@/lib/ad-library/google-ads-regions";
import { TIKTOK_ADS_LIBRARY_REGION_OPTIONS } from "@/lib/ad-library/tiktok-regions";
import { PINTEREST_ADS_COUNTRY_OPTIONS } from "@/lib/ad-library/pinterest-regions";
import { META_COUNTRY_OPTIONS, LINKEDIN_COUNTRY_OPTIONS } from "@/lib/ad-library/scrape-settings-options";
import { buildSnapchatEuGalleryCountryOptions } from "@/lib/apify/snapchat-ads";
import {
  CollapsibleSingleSelectFlagChipRow,
  type RegionChipOption,
} from "@/components/ad-library/single-select-flag-chip-row";
import { validateIdentifierField } from "@/lib/validate-identifier-field";
import {
  buildMetaAdLibraryUrl,
  canonicalLinkedInAdLibraryUrl,
  canonicalMetaAdsLibraryUrl,
  extractMetaAdsLibraryPageId,
} from "@/lib/ad-library/canonical-library-url";
import { canonicalGoogleAdsTransparencyStartUrl } from "@/lib/ad-library/google-transparency-url";
import { buildGoogleTransparencyPreviewUrl } from "@/lib/onboarding/ad-library-preview-urls";

/** “All markets” / world options first; then ISO 3166-1 alpha-2 A–Z (same order on every platform row). */
function compareRegionChipValue(a: string, b: string): number {
  const na = a.trim();
  const nb = b.trim();
  const bucket = (v: string): number => {
    if (v === "") return 0;
    const u = v.toUpperCase();
    if (u === "ALL") return 0;
    if (u === "ANYWHERE" || /^anywhere$/i.test(v)) return 0;
    return 1;
  };
  const d = bucket(na) - bucket(nb);
  if (d !== 0) return d;
  return na.toUpperCase().localeCompare(nb.toUpperCase(), "en");
}

function sortedRegionChipOptions(options: RegionChipOption[]): RegionChipOption[] {
  return [...options].sort((x, y) => compareRegionChipValue(x.value, y.value));
}

export type PlatformIdentifier = {
  /** Numeric Facebook Page ID when resolved */
  meta?: string;
  /** Public facebook.com/… page URL when ID isn’t available */
  metaPageUrl?: string;
  google?: string;
  x?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  /** Optional Microsoft Advertising advertiser ID (numeric) */
  microsoft?: string;
  shopping?: string;
  pinterest?: string;
  /**
   * Optional override for Pinterest Ads search (handle or URL — normalized server-side).
   * If omitted, the handle is derived from `pinterest` or the brand name.
   */
  pinterestAdvertiserName?: string;
  snapchat?: string;
};

function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v.replace(/\/+$/, "");
}

/** Client-side mirror of server Meta Ad Library detection (avoid importing discovery stack with Firecrawl). */
function isFacebookAdLibraryUrl(url: string): boolean {
  const low = url.toLowerCase();
  return (low.includes("facebook.com") || low.includes("fb.com")) && low.includes("ads/library");
}

function buildTikTokAdsLibraryPreviewUrl(advertiserName?: string): string {
  const params = new URLSearchParams({
    region: "all",
    adv_biz_ids: "",
    query_type: "1",
    sort_type: "last_shown_date,desc",
  });
  const trimmed = advertiserName?.trim();
  if (trimmed) params.set("adv_name", trimmed);
  return `https://library.tiktok.com/ads?${params.toString()}`;
}

/** Snapchat EU Ads Gallery deep-link — mirrors the public gallery’s advertiser filter. */
function buildSnapchatAdsGalleryPreviewUrl(keyword?: string): string {
  const u = new URL("https://adsgallery.snap.com/");
  const trimmed = keyword?.trim();
  if (trimmed) u.searchParams.set("advertiser", trimmed);
  return u.toString();
}

function advertiserKeywordFromDomain(domain: string): string {
  const d = domain.replace(/^www\./i, "").trim();
  if (!d) return "";
  return (d.split(".")[0] ?? "").trim();
}

const KEYWORD_CHANNEL_IDS = ["tiktok", "pinterest", "snapchat"] as const;

function keywordDisplayFromDiscovered(
  ids: Partial<PlatformIdentifier>,
  ch: typeof KEYWORD_CHANNEL_IDS[number]
): string {
  const v = ids[ch];
  return typeof v === "string" ? v.replace(/^@+/, "").trim() : "";
}

function buildManualIdentifierSeed(
  discoveredIds: Partial<PlatformIdentifier>,
  recommendedKeywords: string[] | undefined,
  selectedChannels: ChannelId[]
): PlatformIdentifier {
  const next: PlatformIdentifier = { ...discoveredIds };
  delete next.meta;
  delete next.metaPageUrl;
  const g = typeof next.google === "string" ? next.google.trim() : "";
  if (g && !canonicalGoogleAdsTransparencyStartUrl(g)) {
    delete next.google;
  }

  const kwFirst = recommendedKeywords?.[0]?.trim() ?? "";
  for (const ch of KEYWORD_CHANNEL_IDS) {
    if (!selectedChannels.includes(ch)) {
      delete next[ch];
      continue;
    }
    if (kwFirst) {
      next[ch] = kwFirst;
    } else {
      const stripped = keywordDisplayFromDiscovered(discoveredIds, ch);
      next[ch] = stripped ? stripped : undefined;
    }
  }
  return next;
}

/** Primary row title: Google uses `field.label`; short platform name from channel config otherwise. */
function rowHeadingLabel(fieldId: ChannelId, fieldLabelWebsite: string, channelName?: string): string {
  if (fieldId === "google") return fieldLabelWebsite;
  if (!channelName) return fieldId;
  return channelName.replace(/\s+ads$/i, "").trim() || channelName;
}

/**
 * Preview target for each row — when the user has typed something usable, that wins so Preview matches
 * the box; otherwise fall back to server-provided URLs, then domain / generic library home pages.
 */
function buildRowPreviewUrl(
  fieldId: ChannelId,
  value: string,
  serverPreview: Partial<Record<ChannelId, string>>,
  competitorDomain?: string
): string | undefined {
  const v = value.trim();
  const fromServer =
    fieldId === "meta" ? serverPreview.meta : serverPreview[fieldId];
  const ensureHttp = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/\//, "")}`);

  const domainFallback = competitorDomain?.replace(/^www\./i, "").split("/")[0]?.trim() ?? "";

  switch (fieldId) {
    case "meta": {
      if (v) {
        const canon = canonicalMetaAdsLibraryUrl(v);
        if (canon) return canon;
        const url = ensureHttp(v);
        if (isFacebookAdLibraryUrl(url)) return url;
        const digits = v.replace(/\D/g, "");
        if (
          digits.length >= 10 &&
          digits.length <= 22 &&
          /^[\d\s-]+$/.test(v.replace(/[^\d\s-]/g, ""))
        ) {
          return buildMetaAdLibraryUrl(digits);
        }
      }
      if (fromServer?.startsWith("http") && isFacebookAdLibraryUrl(fromServer)) return fromServer;
      return "https://www.facebook.com/ads/library/";
    }
    case "google": {
      if (v) return buildGoogleTransparencyPreviewUrl(v);
      const server = fromServer?.trim() ?? "";
      if (server.startsWith("http")) {
        const canonSrv = canonicalGoogleAdsTransparencyStartUrl(server);
        if (canonSrv) return canonSrv;
      }
      return buildGoogleTransparencyPreviewUrl("");
    }
    case "linkedin": {
      if (v && /linkedin\.com\/ad-library/i.test(v)) return normalizeUrl(v);
      if (fromServer?.startsWith("http") && /linkedin\.com\/ad-library/i.test(fromServer)) return fromServer;
      return "https://www.linkedin.com/ad-library/home";
    }
    case "tiktok":
      return buildTikTokAdsLibraryPreviewUrl(v || undefined);
    case "pinterest":
      return "https://ads.pinterest.com/ads-repository/";
    case "snapchat": {
      if (v.trim()) return buildSnapchatAdsGalleryPreviewUrl(v.trim());
      if (fromServer?.startsWith("http")) return fromServer;
      const advertiser = advertiserKeywordFromDomain(domainFallback);
      return buildSnapchatAdsGalleryPreviewUrl(advertiser || undefined);
    }
    default:
      return undefined;
  }
}

/** Icon + tooltip — compact “why verify” for medium/low confidence matches. */
function DoubleCheckHelpBadge({ fieldId }: { fieldId: string }) {
  const genId = useId();
  const tipId = `rival-double-check-tip-${fieldId}-${genId.replace(/:/g, "")}`;
  const [open, setOpen] = useState(false);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (hideT.current) {
      clearTimeout(hideT.current);
      hideT.current = null;
    }
    setOpen(true);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideT.current) clearTimeout(hideT.current);
    hideT.current = setTimeout(() => setOpen(false), 150);
  }, []);

  return (
    <span
      className="relative inline-flex max-w-full items-center"
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
    >
      <button
        type="button"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50 text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#1e6fa8]/30 focus-visible:ring-offset-1"
        aria-label="About this auto-match"
        aria-describedby={open ? tipId : undefined}
        onFocus={show}
        onBlur={scheduleHide}
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="absolute z-[200] bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-max max-w-[min(14rem,calc(100vw-1.75rem))] rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-slate-600 shadow-[0_8px_30px_rgba(15,23,42,0.12)] pointer-events-none ring-1 ring-black/[0.04]"
        >
          From public pages—not verified. Open{" "}
          <span className="font-semibold text-slate-700">Preview</span> to confirm, then edit if needed.
          <span
            className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 h-0 w-0 border-x-[6px] border-x-transparent border-t-[5px] border-t-slate-200/80"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 -translate-y-px h-0 w-0 border-x-[5px] border-x-transparent border-t-[4px] border-t-white"
            aria-hidden
          />
        </span>
      ) : null}
    </span>
  );
}

/** Compact tip trigger — shows guidance on hover/focus without expanding layout. */
function FieldTipTrigger({ tip, fieldLabel }: { tip: string; fieldLabel: string }) {
  const genId = useId();
  const tipId = `rival-field-tip-${genId.replace(/:/g, "")}`;
  const [open, setOpen] = useState(false);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (hideT.current) {
      clearTimeout(hideT.current);
      hideT.current = null;
    }
    setOpen(true);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideT.current) clearTimeout(hideT.current);
    hideT.current = setTimeout(() => setOpen(false), 150);
  }, []);

  return (
    <span
      className="relative inline-flex max-w-full items-center align-middle"
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
    >
      <button
        type="button"
        title={tip}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-400 outline-none transition-colors hover:bg-slate-50 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-[#1e6fa8]/30 focus-visible:ring-offset-1"
        aria-label={`Tip: ${fieldLabel}`}
        aria-describedby={open ? tipId : undefined}
        onFocus={show}
        onBlur={scheduleHide}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="absolute z-[200] bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-max max-w-[min(16rem,calc(100vw-1.75rem))] rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-slate-600 shadow-[0_8px_30px_rgba(15,23,42,0.12)] pointer-events-none ring-1 ring-black/[0.04]"
        >
          {tip}
          <span
            className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 h-0 w-0 border-x-[6px] border-x-transparent border-t-[5px] border-t-slate-200/80"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 -translate-y-px h-0 w-0 border-x-[5px] border-x-transparent border-t-[4px] border-t-white"
            aria-hidden
          />
        </span>
      ) : null}
    </span>
  );
}

const CHANNEL_FIELDS: {
  id: ChannelId;
  /** Google row primary heading only — other platforms use channel name */
  label: string;
  labelSub?: string;
  labelTitle?: string;
  placeholder: string;
  tip?: string;
  helperText?: string;
}[] = [
  {
    id: "meta",
    label: "",
    labelSub: "Ad Library URL",
    labelTitle: "Ads Library link with view_all_page_id (preferred) or a numeric Page ID.",
    placeholder: "https://www.facebook.com/ads/library/?view_all_page_id=...",
    tip: "We use the Ads Library so lookups target the right Page, not a similarly named profile.",
    helperText: "Must be an Ad Library URL, not a Facebook page URL",
  },
  {
    id: "google",
    label: "Google Ads",
    labelSub: "URL with Advertiser ID",
    labelTitle:
      "URL from Google Ads Transparency Center that includes …/advertiser/AR… in the path.",
    placeholder: "https://adstransparency.google.com/advertiser/AR…",
    tip: "Creative or ad detail URLs work — we shorten them to …/advertiser/AR… automatically.",
    helperText:
      "URL from Google Ads Transparency Center that includes …/advertiser/AR… in the path.",
  },
  {
    id: "tiktok",
    label: "",
    labelSub: "Advertiser name",
    labelTitle:
      "TikTok Ads Library advertiser as plain text (no surrounding quotation marks)",
    placeholder: "e.g. Nike or Apple Germany",
    helperText:
      "Uses advertiser search (`query_type=2`). TikTok often returns zero ads when extra quotes wrap the advertiser (literal quote characters). Use the plain advertiser name from the Ads Library UI. Matches your competitor brand field when blank.",
  },
  {
    id: "linkedin",
    label: "",
    labelSub: "Ad Library URL",
    labelTitle: "Paste the Ad Library search URL (company IDs or company/advertiser slug).",
    placeholder: "https://www.linkedin.com/ad-library/search?companyIds[0]=… or ?accountOwner=…",
    helperText:
      "Prefer a URL with companyIds or accountOwner (Company or advertiser) from the Ad Library. Plain keyword search may pull in other brands.",
  },
  {
    id: "pinterest",
    label: "",
    labelSub: "Search keyword",
    labelTitle: "Keyword used for Pinterest Ads Library search",
    placeholder: "e.g. NOCCO",
    helperText:
      "Results are keyword-based and may include ads from similar brands. Use the most specific keyword for this brand.",
  },
  {
    id: "snapchat",
    label: "",
    labelSub: "Search keyword",
    labelTitle: "Keyword used with brand context for Snapchat disclosure search",
    placeholder: "e.g. NOCCO",
    helperText:
      "Results are keyword-based and may include ads from similar brands. Use the most specific keyword for this brand.",
  },
];

/** Display strings seeded from discovery; Auto-found shows only while each input still matches its snapshot. */
function autoFoundDisplaySnapshot(ids: Partial<PlatformIdentifier>): Partial<Record<ChannelId, string>> {
  const fields: Partial<Record<ChannelId, string>> = {};
  fields.meta = ids.metaPageUrl ?? ids.meta ?? "";
  for (const f of CHANNEL_FIELDS) {
    if (f.id === "meta") continue;
    if (
      f.id === "tiktok" ||
      f.id === "pinterest" ||
      f.id === "snapchat"
    ) {
      fields[f.id] = keywordDisplayFromDiscovered(ids, f.id);
      continue;
    }
    fields[f.id] = typeof ids[f.id] === "string" ? ids[f.id]! : "";
  }
  return fields;
}

type FieldConfidence = "high" | "medium" | "low";

interface ManualIdentifiersFormProps {
  selectedChannels: ChannelId[];
  discoveredIds: Partial<PlatformIdentifier>;
  onSubmit: (identifiers: PlatformIdentifier) => void;
  /** Resolved competitor name (not the raw search box string) */
  competitorLabel: string;
  competitorDomain?: string;
  /** How we interpreted URL vs brand vs keyword chips */
  interpretationSummary?: string;
  fieldConfidence?: Partial<Record<ChannelId, FieldConfidence>>;
  /** Open in new tab to verify a discovered profile */
  fieldPreviewUrls?: Partial<Record<ChannelId, string>>;
  brandLogoUrl?: string;
  /** Region / market picks for ad scrapes (Meta, Google, TikTok, Pinterest, LinkedIn, Snapchat). */
  adLibraryRegions: AdLibraryRegionPrefs;
  onAdLibraryRegionsChange: (next: AdLibraryRegionPrefs) => void;
  /** From discover API — keyword suggestions for TikTok / Snapchat / Pinterest. */
  recommendedKeywords?: string[];
}

function isNonEmptyDiscovered(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Long URLs/IDs: show the right-hand side (path/handle) when the field isn’t focused */
function isScrollWideValue(v: string): boolean {
  const t = v.trim();
  if (t.length < 14) return false;
  return (
    /https?:\/\//i.test(t) ||
    /\.(com|co|ai|io|net|org)\//i.test(t) ||
    /^facebook\.|^www\.facebook|^linkedin\.|^www\.linkedin/i.test(t) ||
    /facebook\.com|linkedin\.com|tiktok\.com|twitter\.com|x\.com|youtube\.com|pinterest\.com|adstransparency\.google/i.test(
      t
    )
  );
}

function useInputScrollEndWhenIdle(value: string, enabled: boolean) {
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!enabled || !isScrollWideValue(value)) return;
    const el = ref.current;
    if (!el) return;
    if (typeof document !== "undefined" && document.activeElement === el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
    });
  }, [value, enabled]);
  return ref;
}

function effectiveChannelValue(
  channelId: ChannelId,
  metaDisplay: string,
  identifiers: PlatformIdentifier
): string {
  if (channelId === "meta") {
    return (metaDisplay.trim() || identifiers.meta || identifiers.metaPageUrl || "").trim();
  }
  return String(identifiers[channelId] ?? "").trim();
}

type DiscoveryTextInputProps = {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder: string;
  className: string;
};

function DiscoveryTextInput({
  id,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  className,
}: DiscoveryTextInputProps) {
  const scrollWide = isScrollWideValue(value);
  const inputRef = useInputScrollEndWhenIdle(value, scrollWide);

  return (
    <div className="min-w-0 w-full max-w-full">
      <input
        id={id}
        ref={inputRef}
        type="text"
        dir="ltr"
        spellCheck={false}
        autoComplete="off"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={(e) => {
          onBlur();
          const el = e.currentTarget;
          requestAnimationFrame(() => {
            if (isScrollWideValue(el.value)) {
              el.scrollLeft = el.scrollWidth;
            }
          });
        }}
        placeholder={placeholder}
        className={`${className} max-w-full min-w-0`}
      />
    </div>
  );
}

/** Split Meta row into numeric id vs facebook URL for API payload */
function mergeMetaFromInput(raw: string): Pick<PlatformIdentifier, "meta" | "metaPageUrl"> {
  const t = raw.trim();
  if (!t) return { meta: undefined, metaPageUrl: undefined };

  const canon = canonicalMetaAdsLibraryUrl(t);
  if (canon) {
    return {
      meta: extractMetaAdsLibraryPageId(canon),
      metaPageUrl: canon,
    };
  }

  const low = t.toLowerCase();
  const adLib =
    low.includes("facebook.com/ads/library") ||
    low.includes("fb.com/ads/library") ||
    low.includes("m.facebook.com/ads/library");
  if (adLib) {
    const normalized = normalizeUrl(t);
    return { meta: undefined, metaPageUrl: normalized };
  }
  if (low.includes("facebook.com") || low.includes("fb.com") || low.includes("fb.me")) {
    return { meta: undefined, metaPageUrl: normalizeUrl(t) };
  }
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 22 && /^[\d\s-]+$/.test(t.replace(/[^\d\s-]/g, ""))) {
    return { meta: digits, metaPageUrl: buildMetaAdLibraryUrl(digits) };
  }
  return { meta: undefined, metaPageUrl: undefined };
}

export function ManualIdentifiersForm({
  selectedChannels,
  discoveredIds,
  onSubmit,
  competitorLabel,
  competitorDomain,
  interpretationSummary,
  fieldConfidence = {},
  fieldPreviewUrls = {},
  brandLogoUrl,
  adLibraryRegions,
  onAdLibraryRegionsChange,
  recommendedKeywords,
}: ManualIdentifiersFormProps) {
  const [identifiers, setIdentifiers] = useState<PlatformIdentifier>(() =>
    buildManualIdentifierSeed(discoveredIds, recommendedKeywords, selectedChannels)
  );
  const [metaDisplay, setMetaDisplay] = useState(
    () => discoveredIds.metaPageUrl ?? discoveredIds.meta ?? ""
  );
  const [focusedField, setFocusedField] = useState<ChannelId | null>(null);
  const [errors, setErrors] = useState<Partial<Record<ChannelId, string>>>({});
  const [warnings, setWarnings] = useState<Partial<Record<ChannelId, string>>>({});

  /** Keeps TikTok / Pinterest / Google / etc. in sync when discovery updates; never overwrites `metaDisplay` (user may have pasted a different Ad Library URL). */
  useEffect(() => {
    setIdentifiers(buildManualIdentifierSeed(discoveredIds, recommendedKeywords, selectedChannels));
  }, [discoveredIds, recommendedKeywords, selectedChannels]);

  const autoFoundDisplaySnap = useMemo(
    () => autoFoundDisplaySnapshot(discoveredIds),
    [discoveredIds]
  );

  const fieldsToShow = CHANNEL_FIELDS.filter((f) => selectedChannels.includes(f.id));

  const keywordRecommendationChips = useMemo(() => {
    const base: string[] = [...(recommendedKeywords ?? [])];
    const bl = competitorLabel.split("/")[0]?.trim();
    if (bl) base.push(bl);
    const dom = competitorDomain?.trim();
    if (dom) {
      base.push(brandSlugFromDomain(dom));
      const stem = dom.replace(/^www\./i, "").replace(/\.[^.]+$/, "");
      if (stem) base.push(stem);
    }
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of base) {
      const t = r.trim();
      if (!t) continue;
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
      if (out.length >= 3) break;
    }
    return out;
  }, [recommendedKeywords, competitorLabel, competitorDomain]);

  const blockingErrorForChannel = useCallback((channelId: ChannelId, value: string): string | null => {
    const v = value.trim();
    if (!v) return null;
    const idv = validateIdentifierField(channelId, v);
    if (!idv.valid && "error" in idv) return idv.error;
    return null;
  }, []);

  const warningForChannel = useCallback((channelId: ChannelId, value: string): string | undefined => {
    const v = value.trim();
    if (!v) return undefined;
    const idv = validateIdentifierField(channelId, v);
    if (!idv.valid && "warning" in idv) return idv.warning;
    return undefined;
  }, []);

  const patchRegions = useCallback(
    (patch: Partial<AdLibraryRegionPrefs>) => {
      onAdLibraryRegionsChange({ ...adLibraryRegions, ...patch });
    },
    [adLibraryRegions, onAdLibraryRegionsChange]
  );

  const metaRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        META_COUNTRY_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value === "ALL" ? "ALL" : o.value,
          flagIso2: o.value === "ALL" ? null : o.value,
        }))
      ),
    []
  );

  const googleRegionOptions = useMemo(() => buildGoogleAdsRegionOptions(), []);
  const googleRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        googleRegionOptions.map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value === "anywhere" ? "ALL" : o.value.toUpperCase(),
          flagIso2: o.value === "anywhere" ? null : /^[A-Za-z]{2}$/.test(o.value) ? o.value.toUpperCase() : null,
        }))
      ),
    [googleRegionOptions]
  );

  const tiktokRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        TIKTOK_ADS_LIBRARY_REGION_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value,
          flagIso2: o.value.length === 2 ? o.value.toUpperCase() : null,
        }))
      ),
    []
  );

  const pinterestRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        PINTEREST_ADS_COUNTRY_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value,
          flagIso2: o.value,
        }))
      ),
    []
  );

  const linkedinRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        LINKEDIN_COUNTRY_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value === "" ? "ALL" : o.value,
          flagIso2: o.value === "" ? null : o.value,
        }))
      ),
    []
  );

  const snapchatRegionChipOptions = useMemo(
    (): RegionChipOption[] =>
      sortedRegionChipOptions(
        buildSnapchatEuGalleryCountryOptions().map((o) => ({
          value: o.value,
          label: o.label,
          shortTag: o.value,
          flagIso2: o.value,
        }))
      ),
    []
  );

  const allSelectedChannelsFilled = useMemo(
    () =>
      selectedChannels.every((ch) =>
        Boolean(effectiveChannelValue(ch, metaDisplay, identifiers))
      ),
    [selectedChannels, metaDisplay, identifiers]
  );

  const handleChange = (channelId: ChannelId, value: string) => {
    if (channelId === "meta") {
      setMetaDisplay(value);
      setErrors((prev) => ({ ...prev, meta: undefined }));
      setWarnings((prev) => ({ ...prev, meta: undefined }));
      return;
    }
    if (channelId === "pinterest") {
      setIdentifiers((prev) => {
        const nextUrl = value || undefined;
        const urlChanged = (prev.pinterest ?? "").trim() !== (nextUrl ?? "").trim();
        return {
          ...prev,
          pinterest: nextUrl,
          ...(urlChanged ? { pinterestAdvertiserName: undefined } : {}),
        };
      });
      setErrors((prev) => ({ ...prev, [channelId]: undefined }));
      setWarnings((prev) => ({ ...prev, [channelId]: undefined }));
      return;
    }
    setIdentifiers((prev) => ({ ...prev, [channelId]: value || undefined }));
    setErrors((prev) => ({ ...prev, [channelId]: undefined }));
    setWarnings((prev) => ({ ...prev, [channelId]: undefined }));
  };

  const handleBlur = (channelId: ChannelId) => {
    setFocusedField(null);
    let nextVal = (identifiers[channelId] ?? "").trim();
    if (!nextVal) {
      setErrors((prev) => ({ ...prev, [channelId]: undefined }));
      setWarnings((prev) => ({ ...prev, [channelId]: undefined }));
      return;
    }

    if (channelId === "linkedin" && /linkedin\.com/i.test(nextVal)) {
      const canon = canonicalLinkedInAdLibraryUrl(nextVal);
      const norm = normalizeUrl(nextVal);
      const chosen = canon ?? norm;
      if (chosen !== nextVal) {
        nextVal = chosen;
        setIdentifiers((prev) => ({ ...prev, linkedin: chosen }));
      }
    }

    if (channelId === "google") {
      const canon = canonicalGoogleAdsTransparencyStartUrl(nextVal);
      if (canon && canon !== nextVal) {
        nextVal = canon;
        setIdentifiers((prev) => ({ ...prev, google: canon }));
      }
    }

    setErrors((prev) => ({ ...prev, [channelId]: blockingErrorForChannel(channelId, nextVal) ?? undefined }));
    setWarnings((prev) => ({ ...prev, [channelId]: warningForChannel(channelId, nextVal) ?? undefined }));
  };

  const handleMetaBlur = () => {
    setFocusedField(null);
    const raw = metaDisplay.trim();
    if (!raw) {
      setErrors((prev) => ({ ...prev, meta: undefined }));
      setWarnings((prev) => ({ ...prev, meta: undefined }));
      return;
    }
    const merged = mergeMetaFromInput(metaDisplay);
    const displayNext = merged.metaPageUrl ?? merged.meta ?? raw;
    setMetaDisplay(displayNext);
    setErrors((prev) => ({ ...prev, meta: blockingErrorForChannel("meta", displayNext) ?? undefined }));
    setWarnings((prev) => ({ ...prev, meta: undefined }));
  };

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<ChannelId, string>> = {};
    const newWarnings: Partial<Record<ChannelId, string>> = {};
    fieldsToShow.forEach((field) => {
      const value =
        field.id === "meta" ? metaDisplay : (identifiers[field.id] ?? "");
      const err = blockingErrorForChannel(field.id, value);
      if (err) newErrors[field.id] = err;
      const warn = warningForChannel(field.id, value);
      if (warn) newWarnings[field.id] = warn;
    });
    setErrors(newErrors);
    setWarnings(newWarnings);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    const metaPart = selectedChannels.includes("meta") ? mergeMetaFromInput(metaDisplay) : {};
    onSubmit({ ...identifiers, ...metaPart });
  };

  const fieldCount = fieldsToShow.length;
  const formMaxWidth =
    fieldCount === 1 ? "max-w-lg" : fieldCount === 2 ? "max-w-3xl" : "max-w-4xl";
  const formGridClass =
    fieldCount === 1
      ? "grid grid-cols-1 gap-y-7"
      : /* stretch row height so left/right columns align inputs; inner flex + flex-1 spacer handles baseline */
        "grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7 items-stretch";

  return (
    <div className={`w-full ${formMaxWidth} mx-auto px-2 sm:px-0 pb-12 sm:pb-16 min-w-0`}>
      <div className="rounded-[24px] border border-gray-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] min-w-0">
        {/* Header — one headline + brand / domain */}
        <div className="px-6 sm:px-8 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
          <div className="flex gap-3 sm:gap-4">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-gray-200">
              {brandLogoUrl || competitorDomain ? (
                <BrandLogoThumb
                  src={brandLogoUrl ?? googleFaviconUrlForDomain(competitorDomain!)}
                  alt=""
                  className="bg-gray-50"
                  onError={(e) => {
                    if (competitorDomain) {
                      const fallback = googleFaviconUrlForDomain(competitorDomain);
                      if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                    }
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-50">
                  <span className="text-sm font-bold text-amber-600">?</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-[17px] sm:text-[19px] font-bold tracking-[-0.02em] text-[#343434] leading-snug">
                Confirm competitor profiles
              </h3>
              <div className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-2">
                {competitorDomain ? (
                  <span
                    className="inline-flex max-w-full items-center truncate rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-[#6b7280]"
                    title={competitorDomain}
                  >
                    {competitorDomain.replace(/^www\./, "")}
                  </span>
                ) : (
                  <span className="text-[13px] font-semibold text-[#343434] truncate max-w-full">
                    {competitorLabel}
                  </span>
                )}
                {interpretationSummary ? (
                  <details className="group max-w-full min-w-0 shrink rounded-lg border border-gray-100 bg-gray-50/80 px-2.5 py-1.5 text-[11px] text-[#6b7280]">
                    <summary className="cursor-pointer select-none font-medium text-[#9ca3af] hover:text-[#6b7280] [&::-webkit-details-marker]:hidden list-none flex items-center gap-1">
                      <span className="inline-block transition-transform group-open:rotate-90 text-[10px]" aria-hidden>
                        ▸
                      </span>
                      Search interpretation
                    </summary>
                    <p className="mt-1.5 pl-4 leading-snug border-l border-gray-200">{interpretationSummary}</p>
                  </details>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 sm:px-8 pt-5 sm:pt-6 pb-8 sm:pb-10">
          <div className={formGridClass}>
            {fieldsToShow.map((field) => {
              const channel = CHANNELS.find((c) => c.id === field.id);
              const value =
                field.id === "meta" ? metaDisplay : (identifiers[field.id] ?? "");
              const rowTitle = rowHeadingLabel(field.id, field.label, channel?.name);
              const wasDiscovered =
                field.id === "meta"
                  ? isNonEmptyDiscovered(discoveredIds.metaPageUrl) ||
                    isNonEmptyDiscovered(discoveredIds.meta)
                  : isNonEmptyDiscovered(discoveredIds[field.id]);
              const conf: FieldConfidence | undefined =
                field.id === "meta"
                  ? fieldConfidence.meta
                  : fieldConfidence[field.id];
              const needsVerify = wasDiscovered && conf && conf !== "high";
              const previewUrl = buildRowPreviewUrl(
                field.id,
                value,
                fieldPreviewUrls,
                competitorDomain
              );
              const showPreview = typeof previewUrl === "string" && previewUrl.startsWith("http");

              const autoFoundSnap = autoFoundDisplaySnap[field.id] ?? "";
              const showAutoFoundBadge =
                wasDiscovered &&
                isNonEmptyDiscovered(autoFoundSnap) &&
                value.trim() !== "" &&
                value === autoFoundSnap;

              const isFocused = focusedField === field.id;
              const error = errors[field.id];
              const warning = warnings[field.id];

              const inputClass = `w-full h-[44px] min-h-[44px] box-border px-3.5 rounded-lg border text-[14px] font-medium placeholder:text-gray-400 transition-all
                        ${error ? "border-red-300 bg-red-50/50" : warning ? "border-amber-300 bg-amber-50/35" : "border-gray-200"}
                        ${isFocused && !error && !warning ? "border-[#343434] ring-2 ring-[#DDF1FD]/50" : ""}
                        ${!isFocused && !error && !warning ? "hover:border-gray-300" : ""}
                        ${wasDiscovered && !error && !warning ? "bg-emerald-50/30" : "bg-white"}`;

              return (
                <div
                  key={field.id}
                  className="flex gap-3 min-w-0 w-full max-w-full h-full min-h-0"
                >
                  {channel && (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-200 shrink-0 self-start mt-0.5 overflow-hidden">
                      {channel.Logo ? (
                        <channel.Logo className="w-4 h-4" />
                      ) : (
                        <div className="w-4 h-4 rounded bg-gray-200" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 max-w-full flex flex-col h-full min-h-0">
                    {/* Label row — badges inline so they don’t crowd the input border */}
                    <div className="shrink-0 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-start w-full min-w-0">
                      <div className="min-w-0 flex flex-row gap-2 items-start w-full">
                        <div className="min-w-0 flex flex-col gap-0.5 flex-1">
                          <label
                            htmlFor={`rival-discover-${field.id}`}
                            className="text-[13px] font-semibold text-[#343434] cursor-pointer leading-snug"
                            title={field.labelTitle}
                          >
                            {rowTitle}
                          </label>
                          {field.labelSub ? (
                            <span className="text-[11px] font-medium text-[#6b7280] leading-snug">
                              {field.labelSub}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-1.5 gap-y-1 sm:pt-0.5 ml-auto">
                          {field.tip ? <FieldTipTrigger tip={field.tip} fieldLabel={rowTitle} /> : null}
                          {showAutoFoundBadge ? (
                            <span className="inline-flex items-center text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.5 rounded-md whitespace-nowrap leading-none">
                              Auto-found
                            </span>
                          ) : null}
                          {needsVerify ? <DoubleCheckHelpBadge fieldId={field.id} /> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-start justify-end self-start pt-px">
                        {showPreview ? (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Preview in new tab"
                            aria-label={`Preview ${rowTitle} in new tab`}
                            className="inline-flex items-center justify-center gap-1 shrink-0 h-8 w-8 sm:h-auto sm:w-auto sm:px-2 rounded-lg border border-transparent text-[#1e6fa8] hover:bg-[#f8fcff] hover:border-[#DDF1FD]/80 hover:text-[#155a8a] transition-colors sm:pt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e6fa8]/30 focus-visible:ring-offset-1"
                          >
                            <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
                            <span className="hidden sm:inline text-[12px] font-semibold whitespace-nowrap">
                              Preview
                            </span>
                          </a>
                        ) : (
                          <span
                            className="inline-flex h-8 w-8 sm:min-h-[2rem] sm:min-w-[5.5rem] shrink-0"
                            aria-hidden
                          />
                        )}
                      </div>
                    </div>
                    {/* Fills extra row height so inputs line up across the 2-col grid */}
                    <div className="flex-1 min-h-0" aria-hidden />
                    <DiscoveryTextInput
                      id={`rival-discover-${field.id}`}
                      value={value}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      onFocus={() => setFocusedField(field.id)}
                      onBlur={() =>
                        field.id === "meta" ? handleMetaBlur() : handleBlur(field.id)
                      }
                      placeholder={field.placeholder}
                      className={`${inputClass} shrink-0`}
                    />
                    {field.helperText ? (
                      <p className="text-[11px] leading-snug shrink-0 mt-2 text-[#64748b]">{field.helperText}</p>
                    ) : null}
                    {field.id === "linkedin" && !wasDiscovered && !value.trim() ? (
                      <p className="text-[11px] leading-snug shrink-0 mt-1 text-[#64748b]">
                        Could not auto-detect. Browse{" "}
                        <span className="whitespace-nowrap">linkedin.com/ad-library/home</span>{" "}
                        to find your link.
                      </p>
                    ) : null}
                    {(field.id === "tiktok" || field.id === "pinterest" || field.id === "snapchat") &&
                    keywordRecommendationChips.length > 1 ? (
                      <div className="flex flex-wrap gap-1.5 mt-2 shrink-0">
                        {keywordRecommendationChips.map((kw) => (
                          <button
                            key={`${field.id}-${kw}`}
                            type="button"
                            onClick={() => handleChange(field.id, kw)}
                            className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-[#4b5563] hover:bg-gray-100 hover:border-gray-300 transition-colors"
                          >
                            {kw}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {field.id === "meta" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="Meta — ad library country"
                        options={metaRegionChipOptions}
                        value={adLibraryRegions.metaCountry}
                        onChange={(v) => patchRegions({ metaCountry: v.toUpperCase() })}
                      />
                    ) : null}
                    {field.id === "google" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="Google — transparency region"
                        options={googleRegionChipOptions}
                        value={adLibraryRegions.googleRegion}
                        onChange={(v) => patchRegions({ googleRegion: v })}
                      />
                    ) : null}
                    {field.id === "tiktok" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="TikTok — ads region"
                        options={tiktokRegionChipOptions}
                        value={adLibraryRegions.tiktokRegion}
                        onChange={(v) => patchRegions({ tiktokRegion: v })}
                      />
                    ) : null}
                    {field.id === "pinterest" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="Pinterest — transparency country"
                        options={pinterestRegionChipOptions}
                        value={adLibraryRegions.pinterestCountry}
                        onChange={(v) => patchRegions({ pinterestCountry: v.toUpperCase() })}
                      />
                    ) : null}
                    {field.id === "linkedin" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="LinkedIn — country filter"
                        options={linkedinRegionChipOptions}
                        value={adLibraryRegions.linkedinCountryCode}
                        onChange={(v) => patchRegions({ linkedinCountryCode: v.toUpperCase() })}
                      />
                    ) : null}
                    {field.id === "snapchat" ? (
                      <CollapsibleSingleSelectFlagChipRow
                        ariaLabel="Snapchat EU gallery — market"
                        options={snapchatRegionChipOptions}
                        value={adLibraryRegions.snapchatCountry}
                        onChange={(v) => patchRegions({ snapchatCountry: v.toUpperCase() })}
                        detailWhenExpanded={
                          <p className="text-[10px] leading-snug text-[#64748b]">
                            Pick a single EU market to anchor Snapchat’s disclosure gallery search. You can change defaults
                            for later imports in scrape settings.
                          </p>
                        }
                      />
                    ) : null}
                    {error ? (
                      <p className="text-[12px] leading-snug shrink-0 mt-2 text-red-500">{error}</p>
                    ) : null}
                    {!error && warning ? (
                      <p className="text-[12px] leading-snug shrink-0 mt-2 text-amber-800">{warning}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-7 pt-5 border-t border-gray-100">
            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-[#343434] text-white font-semibold text-[14px] hover:bg-[#2a2a2a] transition-colors shadow-sm px-4"
            >
              {allSelectedChannelsFilled
                ? "Looks good — continue"
                : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
