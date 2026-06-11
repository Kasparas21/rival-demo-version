"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Crosshair,
  Eye,
  Lightbulb,
  Target,
} from "lucide-react";

import { DemoSectionHeader } from "@/components/landing/hero-variant-b-demo/chrome";
import { DemoActivityScoreCard } from "@/components/marketing/demos/demo-activity-score-card";
import { PLATFORMS, type PlatformName } from "@/components/feature-previews/platform-utils";
import { DEMO_COMPARISON, DEMO_YOUR_BRAND, DEMO_COMPETITOR } from "@/lib/landing/hero-variant-b-demo-data";

const THREE_MOVES = [
  {
    category: "REFRESH CREATIVE",
    pill: "bg-amber-100 text-amber-900 border-amber-200",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-900",
    title: "Replace brand-only Google ads with proof-led hooks",
    evidence:
      "They run 4 price-angle Meta ads live 90+ days — you run 0. Their longest-running proof hook outperforms your generic brand line by lifespan.",
    primary: "Create brief",
    secondary: "See their ads",
  },
  {
    category: "DEFEND",
    pill: "bg-emerald-100 text-emerald-800 border-emerald-200",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800",
    title: "Extend Meta subsidy creative before fatigue hits",
    evidence:
      "Their discount angle has 5 live variants; yours has 1, running 62 days. Competitor refresh velocity on Meta is up 34% this week.",
    primary: "View ads",
    secondary: "Open analysis",
  },
  {
    category: "COPY ANGLE",
    pill: "bg-blue-100 text-blue-800 border-blue-200",
    bar: "bg-blue-500",
    chip: "bg-blue-100 text-blue-800",
    title: "Test their top LinkedIn case-study hook on Meta",
    evidence:
      "MOF case-study ads on LinkedIn — 6 live, avg 48 days — not in your library. Steal the social-proof frame for Meta TOF.",
    primary: "Create brief",
    secondary: "See their ads",
  },
] as const;

const STEALABLE_ROWS = [
  { angle: "Membership hook", them: 24, you: 3, tag: "Steal this", gap: "High" },
  { angle: "Social proof / reviews", them: 18, you: 0, tag: "Steal this", gap: "High" },
  { angle: "Discount urgency", them: 12, you: 8, tag: "Monitor", gap: "Medium" },
  { angle: "Brand awareness", them: 42, you: 38, tag: "Parity", gap: "Low" },
] as const;

const DIGEST_BULLETS = [
  "New angle launched: \"Free consultation this week\" on Meta (3 new creatives).",
  "Platform shift: Google spend signals up — 2 new comparison keywords detected.",
  "Budget move: LinkedIn MOF ads increased from 4 → 6 live creatives.",
  "Creative refresh: TikTok UGC hook retired after 52 days; replaced with creator duet.",
] as const;

type Tier = "PRIMARY" | "SECONDARY" | "MINIMAL" | "INACTIVE";

const BASE_COUNTS: Record<PlatformName, number> = {
  Meta: 205,
  Google: 108,
  TikTok: 28,
  LinkedIn: 18,
  Pinterest: 12,
  Snapchat: 4,
};

function classify(count: number): Tier {
  if (count >= 50) return "PRIMARY";
  if (count >= 15) return "SECONDARY";
  if (count >= 4) return "MINIMAL";
  return "INACTIVE";
}

const TIER_STYLE: Record<Tier, string> = {
  PRIMARY: "bg-[#4a7fa5]/15 text-[#1e4a63] border-[#4a7fa5]/30",
  SECONDARY: "bg-[#dbeafe]/80 text-[#1e40af] border-[#93c5fd]/50",
  MINIMAL: "bg-[#fef3c7]/80 text-[#92400e] border-[#fcd34d]/50",
  INACTIVE: "bg-gray-100 text-gray-500 border-gray-200",
};

export function DemoThreeMovesMarketingView() {
  return (
    <div id="comparison-moves" className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Three moves to make</p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">This week&apos;s tactical priorities</h3>
        <p className="mt-1 text-sm text-slate-500">Grounded in your latest scrape, not generic advice.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-gradient-to-r from-sky-50 to-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800 shadow-sm">
          <Target className="h-3.5 w-3.5 text-sky-600" />
          {DEMO_YOUR_BRAND.name}: performance-led DTC
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-gradient-to-r from-amber-50/80 to-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800 shadow-sm">
          <Crosshair className="h-3.5 w-3.5 text-amber-700" />
          {DEMO_COMPETITOR.name}: full-funnel aggressor
        </span>
      </div>
      <ol className="space-y-5">
        {THREE_MOVES.map((move, index) => (
          <li
            key={move.title}
            className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/40 shadow-sm"
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${move.bar}`} />
            <div className="relative py-5 pl-6 pr-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${move.chip}`}>
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${move.pill}`}>
                    {move.category}
                  </span>
                  <h4 className="text-xl font-semibold tracking-tight text-slate-900">{move.title}</h4>
                  <div className="border-t border-slate-200/80 pt-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">The opportunity</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-700">{move.evidence}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                    <button
                      type="button"
                      data-demo-interactive
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--rival-primary,#343434)] px-4 text-sm font-semibold text-white shadow-sm"
                    >
                      {move.primary}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      data-demo-interactive
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm"
                    >
                      <Eye className="h-4 w-4" />
                      {move.secondary}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DemoStealableAnglesMarketingView() {
  return (
    <div className="space-y-5">
      <DemoSectionHeader
        title="Stealable angles"
        description={`${DEMO_COMPARISON.themLabel} vs ${DEMO_COMPARISON.youLabel} — gaps ranked by opportunity`}
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Angle</th>
              <th className="px-4 py-3">{DEMO_COMPARISON.themLabel}</th>
              <th className="px-4 py-3">{DEMO_COMPARISON.youLabel}</th>
              <th className="px-4 py-3">Gap</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {STEALABLE_ROWS.map((row) => (
              <tr key={row.angle} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{row.angle}</td>
                <td className="px-4 py-3 text-slate-600">{row.them} ads</td>
                <td className="px-4 py-3 text-slate-600">{row.you} ads</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      row.gap === "High"
                        ? "bg-red-100 text-red-800"
                        : row.gap === "Medium"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {row.gap}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" data-demo-interactive className="text-sm font-semibold text-[#2563eb]">
                    {row.tag} →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DemoMondayDigestMarketingView() {
  return (
    <div className="mx-auto max-w-xl">
      <DemoSectionHeader
        title="Monday digest"
        description="Weekly email after each scrape — launches, kills, and platform shifts"
      />
      <article className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-md">
        <div className="border-b border-[#e5e7eb] bg-[#f8fafc] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4a7fa5]">Monday digest</p>
          <p className="mt-1 text-base font-semibold text-[#111827]">
            What changed this week · {DEMO_COMPETITOR.name}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">Mon, 8:00 AM · {DIGEST_BULLETS.length} updates</p>
        </div>
        <ul className="space-y-3 px-5 py-4">
          {DIGEST_BULLETS.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed text-[#475569]">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#4a7fa5]" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        <div className="border-t border-[#e5e7eb] px-5 py-4">
          <button
            type="button"
            data-demo-interactive
            className="w-full rounded-lg bg-[#1e293b] py-2.5 text-sm font-semibold text-white"
          >
            Open full report in Rival
          </button>
        </div>
      </article>
    </div>
  );
}

export function DemoPlatformPrioritizationMarketingView() {
  const [scale, setScale] = useState(1);
  const rows = useMemo(
    () =>
      PLATFORMS.map((platform) => {
        const count = Math.max(0, Math.round(BASE_COUNTS[platform] * scale));
        return { platform, count, tier: classify(count) };
      }),
    [scale],
  );

  return (
    <div className="space-y-4">
      <DemoSectionHeader
        title="Smart platform prioritization"
        description="PRIMARY · SECONDARY · MINIMAL · INACTIVE — based on live ad volume"
      />
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <label className="block text-sm font-semibold text-[#374151]">
          Simulate scrape volume
          <input
            type="range"
            min={0.4}
            max={1.4}
            step={0.1}
            value={scale}
            data-demo-interactive
            onChange={(e) => setScale(Number(e.target.value))}
            className="mt-2 w-full accent-[#4a7fa5]"
          />
        </label>
        <ul className="mt-4 space-y-2">
          {rows.map(({ platform, count, tier }) => (
            <li
              key={platform}
              className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3"
            >
              <span className="text-sm font-semibold text-[#111827]">{platform}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#64748b]">{count} active ads</span>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${TIER_STYLE[tier]}`}>{tier}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DemoActivityScoreMarketingView() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-4">
      <DemoSectionHeader
        title="Activity score"
        description={`How aggressively ${DEMO_COMPETITOR.name} is advertising right now`}
      />
      <button
        type="button"
        data-demo-interactive
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-left shadow-sm"
      >
        <span className="text-sm font-semibold text-[#111827]">Score breakdown</span>
        <ChevronDown className={`size-4 transition ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded ? <DemoActivityScoreCard /> : null}
    </div>
  );
}
