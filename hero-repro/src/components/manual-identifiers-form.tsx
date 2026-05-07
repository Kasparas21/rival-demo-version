"use client";

import React, { useState, useRef, useLayoutEffect, useMemo, useCallback, useId } from "react";
import { ExternalLink } from "lucide-react";
import { CHANNELS, type ChannelId } from "./channel-picker-modal";
import { googleFaviconUrlForDomain } from "@/lib/discovery";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";

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
  reddit?: string;
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

/** Compact tooltip for “Quick double-check” — avoids native title (full-width browser chrome). */
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
      className="relative inline-flex max-w-full"
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
    >
      <button
        type="button"
        className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200/90 px-2 py-0.5 rounded whitespace-nowrap cursor-help outline-none transition-colors hover:bg-slate-200/60 hover:border-slate-300/90 focus-visible:ring-2 focus-visible:ring-[#1e6fa8]/30 focus-visible:ring-offset-1"
        aria-describedby={open ? tipId : undefined}
        onFocus={show}
        onBlur={scheduleHide}
      >
        Quick double-check
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="absolute z-[200] bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-max max-w-[min(15.75rem,calc(100vw-1.75rem))] rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-left text-[11px] font-normal leading-[1.45] text-slate-600 shadow-[0_8px_30px_rgba(15,23,42,0.12)] pointer-events-none ring-1 ring-black/[0.04]"
        >
          <span className="block text-[10px] font-semibold tracking-wide text-slate-500 mb-1">
            Heads up
          </span>
          We matched this from public pages or search — not a formal verification step. Use{" "}
          <span className="font-semibold text-slate-700">Preview in new tab</span> to confirm it&apos;s the
          right profile for this competitor, then edit the field if needed.
          <span
            className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 h-0 w-0 border-x-[7px] border-x-transparent border-t-[6px] border-t-slate-200/80"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 -translate-y-px h-0 w-0 border-x-[6px] border-x-transparent border-t-[5px] border-t-white"
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
  /** Second line under label — keeps Meta/Google visually aligned with multi-line headers */
  labelSub?: string;
  placeholder: string;
  hint: string;
  validator?: FieldValidator;
}[] = [
  {
    id: "meta",
    label: "Facebook / Meta page",
    labelSub: "Numeric Page ID or facebook.com URL",
    placeholder: "e.g. 615512345678901 or facebook.com/yourpage",
    hint: "Numeric Page ID from Meta Business Suite, or the public Facebook page URL",
    validator: (v) => ({
      valid: isValidMetaField(v),
      message: "Enter a 10–22 digit Page ID or a facebook.com page URL",
    }),
  },
  {
    id: "google",
    label: "Website domain",
    labelSub: "Used for Google Ads & domain checks",
    placeholder: "e.g. nike.com",
    hint: "Your competitor's main website domain for Google Ads lookup",
    validator: (v) => ({
      valid: isValidDomain(v),
      message: "Enter a domain like nike.com (no http:// needed)",
      normalize: normalizeDomain,
    }),
  },
  {
    id: "tiktok",
    label: "TikTok handle",
    placeholder: "e.g. @nike",
    hint: "TikTok business or brand username",
    validator: (v) => ({
      valid: isValidHandle(v),
      message: "Enter a handle like @nike",
      normalize: normalizeHandle,
    }),
  },
  {
    id: "linkedin",
    label: "LinkedIn Company page",
    placeholder: "e.g. linkedin.com/company/nike",
    hint: "Full company page URL",
    validator: (v) => ({
      valid: isValidLinkedInUrl(v),
      message: "Enter a full URL like linkedin.com/company/nike",
      normalize: normalizeUrl,
    }),
  },
  {
    id: "pinterest",
    label: "Pinterest business profile",
    labelSub: "We use the profile URL path (handle) for Pinterest Ads search",
    placeholder: "e.g. pinterest.com/myfitnesspal",
    hint: "Pinterest business or profile URL",
    validator: (v) => ({
      valid: !v.trim() || (v.toLowerCase().includes("pinterest.com") && isValidUrl(v)),
      message: "Enter a URL like pinterest.com/username",
      normalize: normalizeUrl,
    }),
  },
  {
    id: "snapchat",
    label: "Snapchat public profile",
    placeholder: "e.g. @myfitnesspal",
    hint: "Snapchat business or public username",
    validator: (v) => ({
      valid: isValidHandle(v),
      message: "Enter a handle like @myfitnesspal",
      normalize: normalizeHandle,
    }),
  },
  {
    id: "reddit",
    label: "Reddit subreddit or user",
    placeholder: "e.g. reddit.com/r/brand or reddit.com/user/brand",
    hint: "Official subreddit or brand /u/ account (often used for Reddit ads)",
    validator: (v) => ({
      valid: !v.trim() || (v.toLowerCase().includes("reddit.com") && isValidUrl(v)),
      message: "Enter a URL like reddit.com/r/subreddit",
      normalize: normalizeUrl,
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
    /facebook\.com|linkedin\.com|reddit\.com|tiktok\.com|twitter\.com|x\.com|youtube\.com|pinterest\.com/i.test(
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
      ? "grid grid-cols-1 gap-y-10"
      : /* stretch row height so left/right columns align inputs; inner flex + flex-1 spacer handles baseline */
        "grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10 items-stretch";

  return (
    <div className={`w-full ${formMaxWidth} mx-auto px-2 sm:px-0 pb-12 sm:pb-16 min-w-0`}>
      <div className="rounded-[24px] border border-gray-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] min-w-0">
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-gray-100">
          <div className="flex gap-4">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-gray-200">
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
                  <span className="text-base font-bold text-amber-600">?</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-[20px] sm:text-[22px] text-[#343434] tracking-tight">
                Help us find your competitor
              </h3>
              <p className="mt-1.5 text-[14px] sm:text-[15px] text-[#6b7280] leading-relaxed">
                We couldn&apos;t find everything automatically for{" "}
                <strong className="text-[#343434]">{competitorLabel}</strong>
                {competitorDomain ? (
                  <span className="text-[#6b7280]"> ({competitorDomain.replace(/^www\./, "")})</span>
                ) : null}
                . Add or fix details below — use{" "}
                <strong className="text-[#343434]">Preview in new tab</strong> on each field to open what we
                found and confirm it&apos;s the same brand.
              </p>
              {interpretationSummary ? (
                <p className="mt-2 text-[13px] text-[#6b7280] leading-relaxed border-l-2 border-[#DDF1FD] pl-3">
                  {interpretationSummary}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 pt-4">
          <div className="rounded-xl border border-[#DDF1FD] bg-[#f8fcff] px-4 py-3 text-[13px] sm:text-[14px] text-[#343434] leading-relaxed">
            <p className="font-semibold text-[#1e6fa8] mb-1">For the best experience on Rival</p>
            <p className="text-[#4b5563]">
              Double-check that each profile and link belongs to <strong>this competitor</strong>, not a
              namesake or reseller. Correct anything that looks off — accurate inputs give you cleaner ad
              intelligence and fewer false matches.
            </p>
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
                    {/* Label block: fixed min-height on sm+ so Meta/Google align with shorter labels; preview never wraps */}
                    <div className="shrink-0 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 w-full min-w-0 sm:min-h-[3.35rem]">
                      <div className="min-w-0 flex-1 sm:pr-2 flex flex-col gap-0.5">
                        <label
                          htmlFor={`rival-discover-${field.id}`}
                          className="text-[13px] font-semibold text-[#343434] cursor-pointer leading-snug"
                        >
                          {field.label}
                        </label>
                        {field.labelSub ? (
                          <span className="text-[11px] font-medium text-[#6b7280] leading-snug">
                            {field.labelSub}
                          </span>
                        ) : (
                          <span className="block min-h-[1.125rem]" aria-hidden />
                        )}
                      </div>
                      {showPreview ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap text-[12px] font-semibold text-[#1e6fa8] hover:text-[#155a8a] hover:underline sm:pt-0.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
                          Preview in new tab
                        </a>
                      ) : null}
                    </div>
                    {/* Badges always on their own row — stable height; empty row keeps rhythm when none */}
                    <div className="shrink-0 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 w-full min-h-[26px]">
                      {showAutoFoundBadge ? (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded whitespace-nowrap">
                          Auto-found
                        </span>
                      ) : null}
                      {needsVerify ? <DoubleCheckHelpBadge fieldId={field.id} /> : null}
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
                    <p
                      className={`text-[12px] leading-snug min-h-[2.5rem] shrink-0 mt-2 ${error ? "text-red-500" : "text-[#6b7280]"}`}
                    >
                      {error ||
                        (field.id === "pinterest" && identifiers.pinterestAdvertiserName?.trim()
                          ? `${field.hint} Pinterest Ads search uses: “${identifiers.pinterestAdvertiserName.trim()}” (from the profile URL).`
                          : field.hint)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
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
