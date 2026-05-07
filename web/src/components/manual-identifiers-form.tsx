"use client";

import React, { useState, useRef, useLayoutEffect, useMemo, useCallback, useId } from "react";
import { ExternalLink, HelpCircle, Info } from "lucide-react";
import { CHANNELS, type ChannelId } from "./channel-picker-modal";
import { googleFaviconUrlForDomain } from "@/lib/discovery";
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

function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = value.startsWith("http") ? value : `https://${value}`;
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidDomain(value: string): boolean {
  if (!value.trim()) return true;
  const v = value.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  return /^[a-z0-9][a-z0-9-]*\.[a-z]{2,}$/i.test(v);
}

function isValidMetaPageId(value: string): boolean {
  if (!value.trim()) return true;
  const d = value.replace(/\s/g, "");
  return /^\d{10,22}$/.test(d);
}

function isValidMetaField(value: string): boolean {
  if (!value.trim()) return true;
  const t = value.trim();
  const digits = t.replace(/\D/g, "");
  if (/^\d[\d\s]*$/.test(t) && digits.length >= 10 && digits.length <= 22) return true;
  const low = t.toLowerCase();
  if (low.includes("facebook.com") || low.includes("fb.com") || low.includes("fb.me")) {
    return isValidUrl(normalizeUrl(t));
  }
  return false;
}

function isValidHandle(value: string): boolean {
  if (!value.trim()) return true;
  const v = value.trim();
  return /^@?[\w.]+$/.test(v) && v.replace("@", "").length >= 2;
}

function isValidLinkedInUrl(value: string): boolean {
  if (!value.trim()) return true;
  const v = value.trim().toLowerCase();
  if (!v.includes("linkedin.com")) return false;
  return isValidUrl(v);
}

function normalizeDomain(value: string): string {
  const v = value.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  return v || value.trim();
}

function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v.replace(/\/+$/, "");
}

function normalizeHandle(value: string): string {
  const v = value.trim();
  if (!v) return v;
  return v.startsWith("@") ? v : `@${v}`;
}

type FieldValidator = (value: string) => { valid: boolean; message?: string; normalize?: (v: string) => string };

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
  label: string;
  labelSub?: string;
  /** Short hint on label hover/focus */
  labelTitle?: string;
  placeholder: string;
  /** Longer guidance — icon tooltip on hover/focus */
  tip?: string;
  validator?: FieldValidator;
}[] = [
  {
    id: "meta",
    label: "Facebook",
    labelSub: "Page ID or page URL",
    labelTitle: "10–22 digit Page ID from Meta Business Suite, or the public facebook.com page URL",
    placeholder: "615512345678901 or facebook.com/…",
    tip: "Use the numeric Page ID from Meta Business Suite, or paste the full public page URL.",
    validator: (v) => ({
      valid: isValidMetaField(v),
      message: "Enter a 10–22 digit Page ID or a facebook.com page URL",
    }),
  },
  {
    id: "google",
    label: "Website",
    labelSub: "Domain (Google Ads)",
    labelTitle: "Main site domain used for Google Ads lookup",
    placeholder: "nike.com",
    tip: "Primary domain only—no https:// needed.",
    validator: (v) => ({
      valid: isValidDomain(v),
      message: "Enter a domain like nike.com (no http:// needed)",
      normalize: normalizeDomain,
    }),
  },
  {
    id: "tiktok",
    label: "TikTok",
    labelSub: "Handle",
    labelTitle: "Brand or business @handle",
    placeholder: "@nike",
    tip: "Business or brand username on TikTok.",
    validator: (v) => ({
      valid: isValidHandle(v),
      message: "Enter a handle like @nike",
      normalize: normalizeHandle,
    }),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    labelSub: "Company URL",
    labelTitle: "Full company page URL",
    placeholder: "linkedin.com/company/…",
    tip: "Paste the full company page URL.",
    validator: (v) => ({
      valid: isValidLinkedInUrl(v),
      message: "Enter a full URL like linkedin.com/company/nike",
      normalize: normalizeUrl,
    }),
  },
  {
    id: "pinterest",
    label: "Pinterest",
    labelSub: "Profile URL",
    labelTitle: "Business profile URL; path is used for Pinterest Ads search",
    placeholder: "pinterest.com/…",
    tip: "Business profile URL. The path (handle) powers Pinterest Ads search.",
    validator: (v) => ({
      valid: !v.trim() || (v.toLowerCase().includes("pinterest.com") && isValidUrl(v)),
      message: "Enter a URL like pinterest.com/username",
      normalize: normalizeUrl,
    }),
  },
  {
    id: "snapchat",
    label: "Snapchat",
    labelSub: "Public profile",
    labelTitle: "Business or public username",
    placeholder: "@myfitnesspal",
    tip: "Public profile or business username.",
    validator: (v) => ({
      valid: isValidHandle(v),
      message: "Enter a handle like @myfitnesspal",
      normalize: normalizeHandle,
    }),
  },
];

/** Stable signature for discovery payloads when the parent swaps competitors or refetches IDs. */
function discoveryFingerprint(ids: Partial<PlatformIdentifier>): string {
  const parts: string[] = [];
  if (ids.meta) parts.push(`meta:${ids.meta}`);
  if (ids.metaPageUrl) parts.push(`metaPageUrl:${ids.metaPageUrl}`);
  const rest = CHANNEL_FIELDS.filter((f) => f.id !== "meta")
    .map((f) => {
      const v = ids[f.id];
      return typeof v === "string" && v.length > 0 ? `${f.id}:${v}` : null;
    })
    .filter((s): s is string => s != null);
  rest.sort((a, b) => a.localeCompare(b));
  parts.sort((a, b) => a.localeCompare(b));
  return [...parts, ...rest].join("|");
}

/** Display strings seeded from discovery; Auto-found shows only while each input still matches its snapshot. */
function autoFoundDisplaySnapshot(ids: Partial<PlatformIdentifier>): Partial<Record<ChannelId, string>> {
  const fields: Partial<Record<ChannelId, string>> = {};
  fields.meta = ids.metaPageUrl ?? ids.meta ?? "";
  for (const f of CHANNEL_FIELDS) {
    if (f.id === "meta") continue;
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
    /facebook\.com|linkedin\.com|tiktok\.com|twitter\.com|x\.com|youtube\.com|pinterest\.com/i.test(
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
  const low = t.toLowerCase();
  if (low.includes("facebook.com") || low.includes("fb.com") || low.includes("fb.me")) {
    return { meta: undefined, metaPageUrl: normalizeUrl(t) };
  }
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 22 && /^[\d\s-]+$/.test(t.replace(/[^\d\s-]/g, ""))) {
    return { meta: digits, metaPageUrl: undefined };
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
}: ManualIdentifiersFormProps) {
  const [identifiers, setIdentifiers] = useState<PlatformIdentifier>(() => {
    const rest = { ...discoveredIds };
    delete rest.meta;
    delete rest.metaPageUrl;
    return rest;
  });
  const [metaDisplay, setMetaDisplay] = useState(
    () => discoveredIds.metaPageUrl ?? discoveredIds.meta ?? ""
  );
  const [focusedField, setFocusedField] = useState<ChannelId | null>(null);
  const [errors, setErrors] = useState<Partial<Record<ChannelId, string>>>({});

  const competitorKey = useMemo(
    () =>
      [competitorLabel, competitorDomain ?? "", discoveryFingerprint(discoveredIds)].join("\0"),
    [competitorLabel, competitorDomain, discoveredIds]
  );

  const autoFoundDisplaySnap = useMemo(
    () => autoFoundDisplaySnapshot(discoveredIds),
    [competitorKey, discoveredIds]
  );

  const fieldsToShow = CHANNEL_FIELDS.filter((f) => selectedChannels.includes(f.id));

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
      return;
    }
    setIdentifiers((prev) => ({ ...prev, [channelId]: value || undefined }));
    setErrors((prev) => ({ ...prev, [channelId]: undefined }));
  };

  const validateField = (channelId: ChannelId, value: string): string | null => {
    if (channelId === "meta") {
      if (!value.trim()) return null;
      return isValidMetaField(value) ? null : "Enter a 10–22 digit Page ID or a facebook.com page URL";
    }
    const field = CHANNEL_FIELDS.find((f) => f.id === channelId);
    if (!field?.validator || !value.trim()) return null;
    const result = field.validator(value);
    return result.valid ? null : result.message ?? "Invalid format";
  };

  const handleBlur = (channelId: ChannelId) => {
    setFocusedField(null);
    let value = identifiers[channelId] ?? "";
    if (!value.trim()) return;

    const field = CHANNEL_FIELDS.find((f) => f.id === channelId);
    if (field?.validator) {
      const result = field.validator(value);
      if (result.normalize) {
        const normalized = result.normalize(value);
        if (normalized !== value.trim()) {
          value = normalized;
          setIdentifiers((prev) => ({ ...prev, [channelId]: normalized }));
        }
      }
      const err = validateField(channelId, value);
      setErrors((prev) => ({ ...prev, [channelId]: err ?? undefined }));
    }
  };

  const handleMetaBlur = () => {
    setFocusedField(null);
    if (!metaDisplay.trim()) {
      setErrors((prev) => ({ ...prev, meta: undefined }));
      return;
    }
    const merged = mergeMetaFromInput(metaDisplay);
    if (merged.metaPageUrl) setMetaDisplay(merged.metaPageUrl);
    else if (merged.meta) setMetaDisplay(merged.meta);
    const err = validateField("meta", merged.metaPageUrl ?? merged.meta ?? metaDisplay);
    setErrors((prev) => ({ ...prev, meta: err ?? undefined }));
  };

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<ChannelId, string>> = {};
    fieldsToShow.forEach((field) => {
      const value =
        field.id === "meta" ? metaDisplay : (identifiers[field.id] ?? "");
      const err = validateField(field.id, value);
      if (err) newErrors[field.id] = err;
    });
    setErrors(newErrors);
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
              const previewUrl =
                field.id === "meta"
                  ? fieldPreviewUrls.meta
                  : fieldPreviewUrls[field.id];
              const showPreview =
                Boolean(previewUrl?.startsWith("http")) &&
                (wasDiscovered || Boolean(value.trim()));

              const autoFoundSnap = autoFoundDisplaySnap[field.id] ?? "";
              const showAutoFoundBadge =
                wasDiscovered &&
                isNonEmptyDiscovered(autoFoundSnap) &&
                value === autoFoundSnap;

              const isFocused = focusedField === field.id;
              const error = errors[field.id];

              const inputClass = `w-full h-[44px] min-h-[44px] box-border px-3.5 rounded-lg border text-[14px] font-medium placeholder:text-gray-400 transition-all
                        ${error ? "border-red-300 bg-red-50/50" : "border-gray-200"}
                        ${isFocused && !error ? "border-[#343434] ring-2 ring-[#DDF1FD]/50" : ""}
                        ${!isFocused && !error ? "hover:border-gray-300" : ""}
                        ${wasDiscovered && !error ? "bg-emerald-50/30" : "bg-white"}`;

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
                    <div className="shrink-0 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 items-start w-full min-w-0 sm:min-h-[2.85rem]">
                      <div className="min-w-0 flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <label
                            htmlFor={`rival-discover-${field.id}`}
                            className="text-[13px] font-semibold text-[#343434] cursor-pointer leading-snug"
                            title={field.labelTitle}
                          >
                            {field.label}
                          </label>
                          {field.tip ? <FieldTipTrigger tip={field.tip} fieldLabel={field.label} /> : null}
                          {showAutoFoundBadge ? (
                            <span className="inline-flex items-center text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.5 rounded-md whitespace-nowrap leading-none">
                              Auto-found
                            </span>
                          ) : null}
                          {needsVerify ? <DoubleCheckHelpBadge fieldId={field.id} /> : null}
                        </div>
                        {field.labelSub ? (
                          <span className="text-[11px] font-medium text-[#6b7280] leading-snug">
                            {field.labelSub}
                          </span>
                        ) : (
                          <span className="block min-h-[1rem]" aria-hidden />
                        )}
                      </div>
                      <div className="flex items-start justify-end sm:pt-0.5">
                        {showPreview ? (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Preview in new tab"
                            aria-label={`Preview ${field.label} in new tab`}
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
                    {!error &&
                    field.id === "pinterest" &&
                    identifiers.pinterestAdvertiserName?.trim() ? (
                      <p className="text-[11px] leading-snug text-[#6b7280] mt-2">
                        Pinterest Ads search:{" "}
                        <span className="font-medium text-[#4b5563]">
                          “{identifiers.pinterestAdvertiserName.trim()}”
                        </span>
                      </p>
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
