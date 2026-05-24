"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  CircleDot,
  Lightbulb,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";

import { AdPreviewAnalysisSkeleton } from "@/components/ad-detail/ad-preview-analysis-skeleton";
import { PsychologicalRadarChart } from "@/components/ad-detail/psychological-radar-chart";
import type { AdPreviewAnalysis } from "@/lib/ad-detail/ad-ai-analysis-types";
import {
  aiGlassCardClass,
  aiGlassHighlightClass,
  aiGlassInsetClass,
  aiGlassShellClass,
  aiSectionLabelClass,
} from "@/lib/ad-detail/ad-preview-analysis-styles";

export type AdPreviewAnalysisQuota = {
  used: number;
  limit: number | null;
  remaining: number | null;
};

type Props = {
  adId: string;
  initialAnalysis: AdPreviewAnalysis | null;
  initialComputedAt: string | null;
  initialQuota: AdPreviewAnalysisQuota | null;
  onAnalysisSaved: (analysis: AdPreviewAnalysis, quota: AdPreviewAnalysisQuota) => void;
};

function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div className={`ai-analysis-reveal ${className}`.trim()} style={{ animationDelay: `${delayMs}ms` }}>
      {children}
    </div>
  );
}

function AnalysisCard({
  title,
  icon,
  children,
  variant = "default",
  delayMs = 0,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  variant?: "default" | "accent";
  delayMs?: number;
}) {
  const shell =
    variant === "accent"
      ? "relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--rival-accent-blue)_55%,white)] bg-gradient-to-br from-white/70 via-[#DDF1FD]/35 to-white/50 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_28px_-14px_rgba(74,127,165,0.2)] backdrop-blur-md ring-1 ring-white/60"
      : `${aiGlassCardClass} p-3.5`;

  return (
    <Reveal delayMs={delayMs} className={shell}>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/80 bg-white/70 text-[#343434] shadow-sm backdrop-blur-sm">
          {icon}
        </span>
        {title}
      </div>
      {children}
    </Reveal>
  );
}

function ContentStyleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--rival-success)_30%,white)] bg-gradient-to-r from-white/90 to-[color-mix(in_srgb,var(--rival-success)_10%,white)] px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_-2px_rgba(149,193,75,0.25)] backdrop-blur-sm">
      <BarChart3 className="h-3 w-3 text-[var(--rival-success)]" />
      {label}
    </span>
  );
}

function ExpandableText({ text, maxChars = 120 }: { text: string; maxChars?: number }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  if (!trimmed) return null;
  const needsToggle = trimmed.length > maxChars;
  const shown = expanded || !needsToggle ? trimmed : `${trimmed.slice(0, maxChars).trim()}…`;

  return (
    <div>
      <p className="text-[12px] leading-relaxed text-slate-800">{shown}</p>
      {needsToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[11px] font-semibold text-[#4a7fa5] hover:text-slate-900"
        >
          {expanded ? "Show less" : "See more"}
        </button>
      ) : null}
    </div>
  );
}

function TagPill({ children, variant = "soft" }: { children: ReactNode; variant?: "soft" | "outline" }) {
  const cls =
    variant === "outline"
      ? "rounded-full border border-white/80 bg-white/60 px-2.5 py-0.5 text-[11px] text-slate-800 shadow-sm backdrop-blur-sm"
      : "rounded-full border border-[color-mix(in_srgb,var(--rival-success)_22%,white)] bg-[color-mix(in_srgb,var(--rival-success)_8%,white)] px-2.5 py-0.5 text-[11px] font-medium text-slate-800";
  return <span className={cls}>{children}</span>;
}

function AnalysisResults({
  analysis,
  computedAt,
  animateChart,
}: {
  analysis: AdPreviewAnalysis;
  computedAt: string | null;
  animateChart: boolean;
}) {
  const personaParts = [
    analysis.persona.age_range ? `Age: ${analysis.persona.age_range}` : null,
    analysis.persona.gender ? `Gender: ${analysis.persona.gender}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <Reveal delayMs={0}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/80 bg-white/70 shadow-sm backdrop-blur-sm">
              <Brain className="h-4 w-4 text-[#343434]" />
            </span>
            AI Analysis
          </div>
          {computedAt ? (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--rival-success)_35%,white)] bg-[color-mix(in_srgb,var(--rival-success)_12%,white)] px-2.5 py-0.5 text-[10px] font-bold text-emerald-900 shadow-sm backdrop-blur-sm">
              Saved · {new Date(computedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          ) : null}
        </div>
      </Reveal>

      <Reveal delayMs={60}>
        <PsychologicalRadarChart scores={analysis.psychological_scores} animate={animateChart} />
      </Reveal>

      <Reveal delayMs={140} className={`${aiGlassCardClass} space-y-2.5 p-3.5`}>
        <p className={aiSectionLabelClass}>Content Style</p>
        <ContentStyleBadge label={analysis.content_style.label} />
        <p className="text-[12px] leading-relaxed text-slate-700">{analysis.content_style.description}</p>
      </Reveal>

      <AnalysisCard title="Creative Targeting" icon={<Target className="h-3.5 w-3.5" />} variant="accent" delayMs={220}>
        <div className={aiGlassInsetClass}>
          <ExpandableText text={analysis.creative_targeting.summary} />
        </div>
        {analysis.creative_targeting.audience_segments.length > 0 ? (
          <ul className="mt-2.5 space-y-1.5 text-[11px] text-slate-700">
            {analysis.creative_targeting.audience_segments.map((seg, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--rival-success)]" />
                <span>{seg}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </AnalysisCard>

      <AnalysisCard title="Persona" icon={<UserRound className="h-3.5 w-3.5" />} delayMs={300}>
        <div className={`${aiGlassInsetClass} text-[12px] text-slate-800`}>
          {personaParts.length > 0 ? personaParts.join("  ·  ") : "Age: Unknown  ·  Gender: Unknown"}
          {analysis.persona.psychographics ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">{analysis.persona.psychographics}</p>
          ) : null}
        </div>
      </AnalysisCard>

      {analysis.marketing_angle ? (
        <Reveal delayMs={380} className={`${aiGlassCardClass} p-3.5`}>
          <p className={`${aiSectionLabelClass} mb-1.5`}>Marketing Angle</p>
          <p className="text-[12px] leading-relaxed text-slate-900">{analysis.marketing_angle}</p>
        </Reveal>
      ) : null}

      {analysis.funnel_stage ? (
        <Reveal delayMs={420}>
          <p className={`${aiSectionLabelClass} mb-1.5`}>Funnel Stage</p>
          <span className="inline-flex rounded-full border border-white/20 bg-gradient-to-r from-[#343434] to-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
            {analysis.funnel_stage}
          </span>
        </Reveal>
      ) : null}

      {analysis.offer_mechanics ? (
        <Reveal delayMs={460} className={`${aiGlassCardClass} p-3.5`}>
          <p className={`${aiSectionLabelClass} mb-1.5`}>Offer Mechanics</p>
          <p className="text-[12px] leading-relaxed text-slate-800">{analysis.offer_mechanics}</p>
        </Reveal>
      ) : null}

      {analysis.scroll_stopper ? (
        <AnalysisCard title="Scroll Stopper" icon={<CircleDot className="h-3.5 w-3.5" />} delayMs={500}>
          <p className="text-[12px] leading-relaxed text-slate-800">{analysis.scroll_stopper}</p>
        </AnalysisCard>
      ) : null}

      {analysis.visual_storytelling ? (
        <Reveal delayMs={540} className={`${aiGlassCardClass} p-3.5`}>
          <p className={`${aiSectionLabelClass} mb-1.5`}>Visual Storytelling</p>
          <p className="text-[12px] leading-relaxed text-slate-800">{analysis.visual_storytelling}</p>
        </Reveal>
      ) : null}

      <Reveal delayMs={580} className="grid grid-cols-1 gap-3">
        {analysis.emotional_drivers.length > 0 ? (
          <div>
            <p className={`${aiSectionLabelClass} mb-2`}>Emotional Drivers</p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.emotional_drivers.map((d, i) => (
                <TagPill key={i}>{d}</TagPill>
              ))}
            </div>
          </div>
        ) : null}

        {analysis.persuasion_triggers.length > 0 ? (
          <div>
            <p className={`${aiSectionLabelClass} mb-2`}>Persuasion Triggers</p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.persuasion_triggers.map((d, i) => (
                <TagPill key={i} variant="outline">
                  {d}
                </TagPill>
              ))}
            </div>
          </div>
        ) : null}
      </Reveal>

      {analysis.competitive_moats.length > 0 ? (
        <AnalysisCard title="Competitive Moats" icon={<Lightbulb className="h-3.5 w-3.5" />} delayMs={640}>
          <ul className="space-y-1.5 text-[12px] text-slate-800">
            {analysis.competitive_moats.map((m, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[var(--rival-success)]">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </AnalysisCard>
      ) : null}

      {analysis.risk_flags.length > 0 ? (
        <Reveal
          delayMs={700}
          className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white/60 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md ring-1 ring-amber-100/80"
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-950">
            <AlertTriangle className="h-3.5 w-3.5" />
            Risk Flags
          </div>
          <ul className="space-y-1 text-[11px] text-amber-950">
            {analysis.risk_flags.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Reveal>
      ) : null}

      <Reveal delayMs={760} className={`${aiGlassCardClass} space-y-3 p-3.5`}>
        <p className={aiSectionLabelClass}>Copy Structure</p>
        <div className="space-y-3 text-[12px]">
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">Hook</p>
            <p className="text-slate-900">{analysis.copy_structure.hook}</p>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">Body Framework</p>
            <ul className="space-y-1 text-slate-900">
              {analysis.copy_structure.body_framework.map((bullet, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[var(--rival-success)]">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">CTA Pattern</p>
            <p className="text-slate-900">{analysis.copy_structure.cta_pattern}</p>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">Emotional Register</p>
            <p className="text-slate-900">{analysis.copy_structure.emotional_register}</p>
          </div>
        </div>
      </Reveal>

      <Reveal delayMs={820} className={aiGlassHighlightClass}>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[color-mix(in_srgb,var(--rival-success)_35%,transparent)] blur-2xl"
        />
        <p className="relative mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
          Adaptation Playbook
        </p>
        <ul className="relative space-y-1.5 text-[12px] leading-relaxed">
          {analysis.adaptation_playbook.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-[var(--rival-success)]">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="relative mt-3 border-t border-white/15 pt-3 text-[11px] leading-relaxed text-white/75">
          {analysis.copy_structure.adapt_for_your_brand}
        </p>
      </Reveal>

      <Reveal delayMs={880}>
        <p className="text-[10px] text-slate-500">
          Confidence:{" "}
          <span className="font-bold capitalize text-slate-800">{analysis.confidence}</span>
        </p>
      </Reveal>
    </div>
  );
}

export function AdPreviewAnalysisPanel({
  adId,
  initialAnalysis,
  initialComputedAt,
  initialQuota,
  onAnalysisSaved,
}: Props) {
  const [analysis, setAnalysis] = useState<AdPreviewAnalysis | null>(initialAnalysis);
  const [computedAt, setComputedAt] = useState<string | null>(initialComputedAt);
  const [quota, setQuota] = useState<AdPreviewAnalysisQuota | null>(initialQuota);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animateChart, setAnimateChart] = useState(Boolean(initialAnalysis));

  useEffect(() => {
    setAnalysis(initialAnalysis);
    setComputedAt(initialComputedAt);
    setQuota(initialQuota);
    setAnimateChart(Boolean(initialAnalysis));
  }, [adId, initialAnalysis, initialComputedAt, initialQuota]);

  const runAnalysis = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    setAnimateChart(false);
    try {
      const res = await fetch("/api/ad-detail/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adId }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        analysis?: AdPreviewAnalysis;
        computed_at?: string;
        quota?: AdPreviewAnalysisQuota;
        error?: string;
      };

      if (!json.ok || !json.analysis) {
        setError(json.error ?? "Analysis failed");
        return;
      }

      setAnalysis(json.analysis);
      setComputedAt(json.computed_at ?? new Date().toISOString());
      setAnimateChart(true);
      if (json.quota) {
        setQuota(json.quota);
        onAnalysisSaved(json.analysis, json.quota);
      } else {
        onAnalysisSaved(json.analysis, quota ?? { used: 0, limit: null, remaining: null });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  }, [adId, onAnalysisSaved, quota, running]);

  const quotaLabel =
    quota?.limit != null
      ? `${quota.used}/${quota.limit} analyses this month`
      : quota
        ? `${quota.used} analyses this month`
        : null;

  return (
    <div className="relative p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#DDF1FD]/20 via-transparent to-[color-mix(in_srgb,var(--rival-success)_6%,transparent)]"
      />

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={aiSectionLabelClass}>AI Analysis</p>
            {quotaLabel ? <p className="mt-1 text-[10px] font-medium text-slate-500">{quotaLabel}</p> : null}
          </div>
          {!analysis && !running ? (
            <button
              type="button"
              onClick={() => void runAnalysis()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-gradient-to-r from-[#343434] to-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_24px_-8px_rgba(52,52,52,0.45)] transition hover:brightness-110"
            >
              <Sparkles className="h-3 w-3 text-[var(--rival-success)]" />
              Run AI Analysis
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-[12px] text-red-700 backdrop-blur-sm">
            {error}
          </div>
        ) : null}

        {running ? <AdPreviewAnalysisSkeleton /> : null}

        {!running && analysis ? (
          <AnalysisResults analysis={analysis} computedAt={computedAt} animateChart={animateChart} />
        ) : null}

        {!running && !analysis ? (
          <div className={`${aiGlassShellClass} p-4`}>
            <p className="text-[12px] leading-relaxed text-slate-600">
              Click{" "}
              <strong className="font-semibold text-slate-900">Run AI Analysis</strong> to generate psychological
              scores, targeting, persona, copy structure, and an adaptation playbook. Analysis is saved to this ad
              permanently.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
