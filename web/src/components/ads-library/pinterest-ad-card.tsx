"use client";

import { useMemo } from "react";
import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
import { AdCreativeVideoOrImage } from "@/components/ads-library/ad-creative-video-or-image";
import { UnverifiedSourceBadge } from "@/components/ads-library/unverified-source-overlay";
import type {
  PinterestAdCard as PinterestAdCardModel,
  PinterestTargetingRow,
} from "@/lib/ad-library/normalize";

const LEGACY_KEY_LABELS: Record<string, string> = {
  ages: "Age ranges",
  agegroups: "Age ranges",
  genders: "Gender",
  countries: "Countries",
  regions: "Regions",
  metros: "Metro areas",
  interests: "Interests",
  keywords: "Keywords",
  languages: "Languages",
  devices: "Devices",
  placements: "Placements",
};

function humanizeLabel(raw: string): string {
  const k = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (LEGACY_KEY_LABELS[k]) return LEGACY_KEY_LABELS[k]!;
  return raw
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Omitted from Audience targeting — noisy for most users; scraping still receives full API payload. */
function isHiddenPinterestTargetingRow(row: PinterestTargetingRow): boolean {
  const n = row.label.trim().toLowerCase().replace(/\s+/g, "");
  return n === "pinnerlisttypes" || n === "pinnerlisttype";
}

/**
 * Parses API summary strings (`A: x · B: y`) and legacy cache rows (`ages: … · countries: …`).
 */
function targetingRowsFromDesc(desc: string | undefined): PinterestTargetingRow[] {
  const d = desc?.trim();
  if (!d || d === "—") return [];
  const parts = d
    .split(/\s*[·•]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  const rows: PinterestTargetingRow[] = [];
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) {
      /** Single blob with no colon — caller may surface as unstructured */
      rows.push({ label: "Targeting", value: part });
      continue;
    }
    const labelRaw = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!value || !labelRaw) continue;
    const row = { label: humanizeLabel(labelRaw), value };
    if (isHiddenPinterestTargetingRow(row)) continue;
    rows.push(row);
  }
  return rows;
}

function ChipValue({ segment }: { segment: string }) {
  const t = segment.trim();
  if (!t) return null;
  return (
    <span className="inline-flex max-w-full rounded-full border border-[#e2e8f0] bg-white px-2.5 py-1 text-[12px] font-medium leading-snug text-[#1e293b] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] [overflow-wrap:anywhere]">
      {t}
    </span>
  );
}

function TargetingValues({ value }: { value: string }) {
  const chunks = value
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!chunks.length) return null;
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {chunks.map((c, i) => (
        <ChipValue key={`${i}:${c.slice(0, 24)}`} segment={c} />
      ))}
    </div>
  );
}

function FactsRow({
  label,
  value,
  dense,
  chips,
}: {
  label: string;
  value: string;
  dense?: boolean;
  chips?: boolean;
}) {
  return (
    <div className={`grid grid-cols-1 gap-0.5 sm:grid-cols-[minmax(0,8rem)_minmax(0,1fr)] sm:gap-3 sm:items-start ${dense ? "py-2" : "py-3"} border-b border-[#eef2f6] last:border-b-0`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wide text-[#64748b] pt-px ${dense ? "" : "sm:pt-1.5"}`}>{label}</div>
      {chips ? (
        <TargetingValues value={value} />
      ) : (
        <p className="min-w-0 text-[13px] font-semibold tabular-nums leading-snug text-[#0f172a] [overflow-wrap:anywhere]">{value}</p>
      )}
    </div>
  );
}

export function PinterestAdCard({ ad }: { ad: PinterestAdCardModel }) {
  const targetingRows = useMemo(() => {
    const raw = ad.targetingRows?.length ? ad.targetingRows : targetingRowsFromDesc(ad.desc);
    return raw.filter((row) => !isHiddenPinterestTargetingRow(row));
  }, [ad.desc, ad.targetingRows]);

  const unstructuredTargeting = useMemo(() => {
    if (targetingRows.length !== 1) return null;
    const only = targetingRows[0];
    /** One segment with generic label + long prose — editable copy, not KV pairs */
    if (only.label === "Targeting" && !ad.desc?.includes(":")) return only.value;
    if (only.label === "Targeting" && only.value.length > 280) return only.value;
    return null;
  }, [targetingRows, ad.desc]);

  const structuredRows = unstructuredTargeting ? [] : targetingRows;
  const hasStructuredTargeting = structuredRows.length > 0;

  const hasFacts = Boolean(ad.disclosureWindow ?? ad.reachSummary ?? ad.impressionsLabel);

  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-left backdrop-blur-sm transition-all duration-200 hover:border-[#DDF1FD]/60 hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)]">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 break-words text-[15px] font-semibold text-[#bd081c] [overflow-wrap:anywhere]">{ad.advertiser}</p>
          {ad.advertiserMismatch ? <UnverifiedSourceBadge /> : null}
        </div>
        <p className="mt-0.5 text-[12px] text-[#6b7280]">Pinterest Ad Transparency (EU / BR / TR)</p>

        {hasFacts ? (
          <div className="mt-3 space-y-0 rounded-xl border border-[#eef2f6] bg-[#fafbff] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            {ad.disclosureWindow ? (
              <FactsRow label="Reporting window" value={ad.disclosureWindow} dense />
            ) : null}
            {ad.reachSummary ? <FactsRow label="Reach (EU)" value={ad.reachSummary} dense /> : null}
            {ad.impressionsLabel ? (
              <FactsRow label="Impressions" value={ad.impressionsLabel} dense />
            ) : null}
          </div>
        ) : null}

        {hasStructuredTargeting ? (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Audience targeting</p>
            <div className="rounded-xl border border-[#eef2f6] bg-[#fafbff] px-3 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              {structuredRows.map((row, idx) => (
                <FactsRow key={`pin-t-${idx}-${row.label}`} label={row.label} value={row.value} chips />
              ))}
            </div>
          </div>
        ) : null}

        {unstructuredTargeting ? (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Targeting</p>
            <div className="rounded-xl border border-[#eef2f6] bg-[#fafbff] px-3 py-2">
              <ExpandableAdText
                text={unstructuredTargeting}
                className="text-[13px] leading-relaxed text-[#374151] [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-pretty"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y border-[#e5e7eb] bg-[#f9fafb]">
        <AdCreativeVideoOrImage
          img={ad.img ?? ""}
          videoUrl={ad.videoUrl}
          openHref={ad.adUrl}
          className="min-h-0 w-full flex-1"
          minHeightClass="min-h-[200px]"
          fillAvailableHeight
        />
        <a
          href={ad.adUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block shrink-0 border-t border-[#e5e7eb] bg-white p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#bd081c]"
        >
          <p className="text-pretty text-[15px] font-semibold leading-snug text-[#374151] [overflow-wrap:anywhere] break-words">{ad.headline}</p>
          {ad.url && ad.url !== "—" ? (
            <p className="mt-0.5 break-all text-[13px] text-[#6b7280] [overflow-wrap:anywhere]">{ad.url}</p>
          ) : null}
        </a>
      </div>
    </article>
  );
}
