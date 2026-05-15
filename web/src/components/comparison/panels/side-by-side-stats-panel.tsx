"use client";

import { useMemo, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import type { ComparisonDerivedStats } from "@/lib/comparison/scraped-ads-derived-stats";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { COMPARISON_PLATFORM_ORDER } from "@/components/comparison/platform-icon";

type Props = {
  workspaceName: string;
  competitorName: string;
  workspacePayload: CompetitorStrategyOverviewPayload | null;
  competitorPayload: CompetitorStrategyOverviewPayload | null;
  workspaceDerived: ComparisonDerivedStats;
  competitorDerived: ComparisonDerivedStats;
  workspaceDataIncomplete?: boolean;
};

type Cmp = "ahead" | "behind" | "tied";

function pctDiff(a: number, b: number): number {
  const d = Math.abs(a - b);
  const base = Math.max(Math.abs(a), Math.abs(b), 1e-6);
  return d / base;
}

function tied(a: number, b: number, tol = 0.1): boolean {
  return pctDiff(a, b) <= tol;
}

type HeroMetric = {
  key: string;
  title: string;
  youNum: number;
  themNum: number;
  youFmt: string;
  themFmt: string;
  cmp: Cmp;
  higherIsBetter: boolean;
  blurb: string;
};

function formatSpend(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(n)}`;
}

function AnimatedNumber({ value, suffix = "", reduce }: { value: number; suffix?: string; reduce: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const iv = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <span ref={ref} className="tabular-nums">
      {iv && !reduce ? (
        <motion.span
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <motion.span
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            {value}
            {suffix}
          </motion.span>
        </motion.span>
      ) : (
        <>
          {value}
          {suffix}
        </>
      )}
    </span>
  );
}

function formatBucketCounts(formats: { format: string; count: number }[] | undefined) {
  const o = { text: 0, image: 0, video: 0, other: 0 };
  if (!formats?.length) return { ...o, total: 0 };
  for (const f of formats) {
    const k = f.format.toLowerCase();
    const c = f.count;
    if (k.includes("video") || k === "reel" || k.includes("shorts")) o.video += c;
    else if (k.includes("image") || k.includes("carousel")) o.image += c;
    else if (k.includes("text")) o.text += c;
    else o.other += c;
  }
  const total = o.text + o.image + o.video + o.other;
  return { ...o, total };
}

function FormatMixMiniBar({
  label,
  counts,
}: {
  label: string;
  counts: { text: number; image: number; video: number; other: number; total: number };
}) {
  const t = counts.total;
  const pct = (n: number) => (t > 0 ? Math.round((n / t) * 1000) / 10 : 0);
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div
        className="mt-1 flex h-6 w-full overflow-hidden rounded-md border border-slate-200/90 bg-slate-100"
        title={`Text ${pct(counts.text)}% · Image ${pct(counts.image)}% · Video ${pct(counts.video)}%${
          counts.other ? ` · Other ${pct(counts.other)}%` : ""
        }`}
      >
        {counts.text > 0 ? (
          <span
            className="h-full bg-slate-500"
            style={{ width: `${(counts.text / t) * 100}%` }}
          />
        ) : null}
        {counts.image > 0 ? (
          <span
            className="h-full bg-sky-500"
            style={{ width: `${(counts.image / t) * 100}%` }}
          />
        ) : null}
        {counts.video > 0 ? (
          <span
            className="h-full bg-violet-500"
            style={{ width: `${(counts.video / t) * 100}%` }}
          />
        ) : null}
        {counts.other > 0 ? (
          <span
            className="h-full bg-slate-300"
            style={{ width: `${(counts.other / t) * 100}%` }}
          />
        ) : null}
      </div>
      <p className="mt-1 text-[10px] text-slate-500 tabular-nums">
        T {counts.text} · I {counts.image} · V {counts.video}
        {counts.other ? ` · +${counts.other}` : ""}
      </p>
    </div>
  );
}

export function SideBySideStatsPanel({
  workspaceName,
  competitorName,
  workspacePayload,
  competitorPayload,
  workspaceDerived,
  competitorDerived,
  workspaceDataIncomplete,
}: Props) {
  const platTotal = COMPARISON_PLATFORM_ORDER.length;
  const reduceMotion = useReducedMotion() ?? false;

  const dashYou = workspaceDataIncomplete || !workspacePayload;
  const dashThem = !competitorPayload;

  const data = useMemo(() => {
    const youActive = workspacePayload?.map?.activeAdCount ?? NaN;
    const themActive = competitorPayload?.map?.activeAdCount ?? NaN;
    const youPlat = workspacePayload?.map?.platformCount ?? NaN;
    const themPlat = competitorPayload?.map?.platformCount ?? NaN;
    const youNew = workspaceDerived.newAdsLast30d;
    const themNew = competitorDerived.newAdsLast30d;
    const youAge = workspaceDerived.avgAdAgeDays;
    const themAge = competitorDerived.avgAdAgeDays;
    const youVideo = workspaceDerived.videoPercent;
    const themVideo = competitorDerived.videoPercent;
    const youAngles = workspaceDerived.uniqueAnglesCount;
    const themAngles = competitorDerived.uniqueAnglesCount;
    const youSpend = workspacePayload?.map?.totalAdSpend?.value ?? NaN;
    const themSpend = competitorPayload?.map?.totalAdSpend?.value ?? NaN;

    type Cand = {
      key: string;
      title: string;
      score: number;
      you: number;
      them: number;
      youFmt: string;
      themFmt: string;
      higherIsBetter: boolean;
      cmp: Cmp;
      blurb: string;
    };

    const cands: Cand[] = [];

    const push = (
      key: string,
      title: string,
      you: number,
      them: number,
      higherIsBetter: boolean,
      youFmt: string,
      themFmt: string,
      blurb: (lead: string) => string
    ) => {
      if (dashYou || dashThem || !Number.isFinite(you) || !Number.isFinite(them)) return;
      let cmp: Cmp = "tied";
      if (!tied(you, them)) {
        if (higherIsBetter) cmp = you > them ? "ahead" : "behind";
        else cmp = you < them ? "ahead" : "behind";
      }
      const score = pctDiff(you, them);
      cands.push({
        key,
        title,
        score,
        you,
        them,
        youFmt,
        themFmt,
        higherIsBetter,
        cmp,
        blurb: blurb(
          !tied(you, them)
            ? higherIsBetter
              ? you > them
                ? "lead"
                : "trail"
              : you < them
                ? "lead"
                : "trail"
            : "tie"
        ),
      });
    };

    push(
      "video",
      "Video creative %",
      youVideo,
      themVideo,
      true,
      `${youVideo}%`,
      `${themVideo}%`,
      (x) => (x === "lead" ? "Stronger motion mix" : x === "trail" ? "Room to add video" : "Even motion mix")
    );
    push(
      "angles",
      "Unique angles",
      youAngles,
      themAngles,
      true,
      `${youAngles}`,
      `${themAngles}`,
      (x) => (x === "lead" ? "Broader tests live" : x === "trail" ? "Tighter angle mix" : "Matched breadth")
    );
    push(
      "age",
      "Avg ad age",
      youAge,
      themAge,
      false,
      `${youAge}d`,
      `${themAge}d`,
      (x) => (x === "lead" ? "Fresher rotation" : x === "trail" ? "Their shelf runs longer" : "Matched cadence")
    );
    push(
      "new30",
      "New ads (30d)",
      youNew,
      themNew,
      true,
      `${youNew}`,
      `${themNew}`,
      (x) => (x === "lead" ? "Higher launch tempo" : x === "trail" ? "They are shipping faster" : "Matched launches")
    );
    push(
      "spend",
      "Modeled €/mo",
      youSpend,
      themSpend,
      true,
      `€${formatSpend(youSpend)}`,
      `€${formatSpend(themSpend)}`,
      (x) => (x === "lead" ? "Higher modeled pressure" : x === "trail" ? "They model hotter spend" : "Matched intensity")
    );

    if (!dashYou && !dashThem && Number.isFinite(youActive) && Number.isFinite(themActive)) {
      if (!tied(youActive, themActive)) {
        const higherIsBetter = true;
        const cmp: Cmp = youActive > themActive ? "ahead" : "behind";
        cands.push({
          key: "active",
          title: "Active ads",
          score: pctDiff(youActive, themActive),
          you: youActive,
          them: themActive,
          youFmt: String(youActive),
          themFmt: String(themActive),
          higherIsBetter,
          cmp,
          blurb: cmp === "ahead" ? "More live ads" : "They carry more live ads",
        });
      }
    }

    if (!dashYou && !dashThem && Number.isFinite(youPlat) && Number.isFinite(themPlat)) {
      if (!tied(youPlat, themPlat)) {
        const higherIsBetter = true;
        const cmp: Cmp = youPlat > themPlat ? "ahead" : "behind";
        cands.push({
          key: "plat",
          title: "Platforms",
          score: pctDiff(youPlat, themPlat),
          you: youPlat,
          them: themPlat,
          youFmt: `${youPlat}/${platTotal}`,
          themFmt: `${themPlat}/${platTotal}`,
          higherIsBetter,
          cmp,
          blurb: cmp === "ahead" ? "Wider channel reach" : "They cover more surfaces",
        });
      }
    }

    const sorted = [...cands].sort((a, b) => b.score - a.score);
    const heroes = sorted.slice(0, 3);

    const fill: HeroMetric[] = heroes.map((h) => ({
      key: h.key,
      title: h.title.toUpperCase(),
      youNum: h.you,
      themNum: h.them,
      youFmt: h.youFmt,
      themFmt: h.themFmt,
      cmp: h.cmp,
      higherIsBetter: h.higherIsBetter,
      blurb: h.blurb,
    }));

    return { fill };
  }, [
    workspacePayload,
    competitorPayload,
    workspaceDerived,
    competitorDerived,
    dashYou,
    dashThem,
    platTotal,
  ]);

  const secondaries = useMemo(() => {
    const youActive = workspacePayload?.map?.activeAdCount;
    const themActive = competitorPayload?.map?.activeAdCount;
    const youPlat = workspacePayload?.map?.platformCount;
    const themPlat = competitorPayload?.map?.platformCount;
    const youNew = workspaceDerived.newAdsLast30d;
    const themNew = competitorDerived.newAdsLast30d;
    const youSpend = workspacePayload?.map?.totalAdSpend?.value;
    const themSpend = competitorPayload?.map?.totalAdSpend?.value;

    const items: { label: string; you: string; them: string; ind: string }[] = [];

    if (!dashYou && !dashThem && youActive != null && themActive != null) {
      items.push({
        label: "Active ads",
        you: String(youActive),
        them: String(themActive),
        ind: tied(youActive, themActive) ? "=" : youActive > themActive ? ">" : "<",
      });
    }
    if (!dashYou && !dashThem && youPlat != null && themPlat != null) {
      items.push({
        label: "Platforms",
        you: `${youPlat}/${platTotal}`,
        them: `${themPlat}/${platTotal}`,
        ind: tied(youPlat, themPlat) ? "=" : youPlat > themPlat ? ">" : "<",
      });
    }
    if (!dashYou && !dashThem) {
      items.push({
        label: "New 30d",
        you: String(youNew),
        them: String(themNew),
        ind: tied(youNew, themNew) ? "=" : youNew > themNew ? ">" : "<",
      });
    }
    if (!dashYou && !dashThem && youSpend != null && themSpend != null) {
      items.push({
        label: "Modeled €",
        you: `€${formatSpend(youSpend)}`,
        them: `€${formatSpend(themSpend)}`,
        ind: tied(youSpend, themSpend, 0.08) ? "≈" : youSpend > themSpend ? ">" : "<",
      });
    }

    return items;
  }, [
    workspacePayload,
    competitorPayload,
    workspaceDerived,
    dashYou,
    dashThem,
    platTotal,
  ]);

  const formatMix = useMemo(
    () => ({
      you: formatBucketCounts(workspacePayload?.insights?.ad_format_mix?.formats),
      them: formatBucketCounts(competitorPayload?.insights?.ad_format_mix?.formats),
    }),
    [workspacePayload, competitorPayload]
  );

  return (
    <div
      id="comparison-head-stats"
      className="relative mb-12 scroll-mt-36 pt-8 pb-2"
    >
      <div
        className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
        aria-hidden
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Head-to-head</p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
        Where {workspaceName} and {competitorName} diverge
      </h3>

      {dashYou || dashThem ? (
        <p className="mt-4 text-sm text-slate-500">Connect both brands with fresh scrapes to unlock the hero gaps.</p>
      ) : (
        <>
          {data.fill.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 text-sm leading-relaxed text-slate-600">
              No standout gaps on these metrics — both brands look closely matched where we can measure. Use the sections below for creative and angle detail.
            </p>
          ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {data.fill.map((h, i) => (
              <motion.div
                key={h.key}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-8%" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="relative rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-5"
              >
                <span
                  className={`absolute right-4 top-4 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                    h.cmp === "ahead"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : h.cmp === "behind"
                        ? "bg-amber-50 text-amber-800 ring-amber-200"
                        : "bg-slate-50 text-slate-600 ring-slate-200"
                  }`}
                >
                  {h.cmp === "ahead" ? "Ahead" : h.cmp === "behind" ? "Behind" : "Tied"}
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{h.title}</p>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
                  {h.key === "spend" ? (
                    <motion.span
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                    >
                      {h.youFmt}
                    </motion.span>
                  ) : h.key === "video" || h.key === "age" ? (
                    <AnimatedNumber value={h.youNum} suffix={h.key === "video" ? "%" : "d"} reduce={reduceMotion} />
                  ) : (
                    <AnimatedNumber value={h.youNum} reduce={reduceMotion} />
                  )}
                </div>
                <p className="mt-1 text-xs font-medium text-slate-400">vs</p>
                <div className="text-2xl font-medium text-slate-500">
                  {h.themFmt}
                  <span className="sr-only"> {competitorName}</span>
                </div>
                <p className="mt-4 text-xs leading-snug text-slate-500">{h.blurb}</p>
              </motion.div>
            ))}
          </div>
          )}

          {secondaries.length > 0 ? (
            <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 px-2 py-3">
              <div className="flex flex-wrap divide-x divide-slate-200/90">
                {secondaries.map((s) => (
                  <div key={s.label} className="flex min-w-[140px] flex-1 flex-col gap-0.5 px-3 py-1 text-sm text-slate-700">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</span>
                    <span className="tabular-nums font-medium">
                      {s.you} <span className="text-slate-400">{s.ind}</span> {s.them}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 px-3 text-xs text-slate-500">
                You · <span className="font-medium text-slate-700">{workspaceName}</span> — Them ·{" "}
                <span className="font-medium text-slate-700">{competitorName}</span>
              </p>
            </div>
          ) : null}

          {!dashYou && !dashThem && (formatMix.you.total > 0 || formatMix.them.total > 0) ? (
            <div className="mt-6 rounded-lg border border-slate-100 bg-white px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Format mix</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Active ads by format family (text / image / video)</p>
              <div className="mt-3 flex gap-4">
                <FormatMixMiniBar label={workspaceName} counts={formatMix.you} />
                <FormatMixMiniBar label={competitorName} counts={formatMix.them} />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
