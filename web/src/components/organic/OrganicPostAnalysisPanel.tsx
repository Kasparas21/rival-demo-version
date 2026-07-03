"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Lightbulb,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { AdPreviewAnalysisSkeleton } from "@/components/ad-detail/ad-preview-analysis-skeleton";
import {
  aiGlassCardClass,
  aiGlassShellClass,
  aiSectionLabelClass,
} from "@/lib/ad-detail/ad-preview-analysis-styles";
import type {
  OrganicPostAnalysisQuota,
  OrganicPostPreviewAnalysis,
} from "@/lib/organic-content/organic-post-ai-analysis-types";

import { OrganicPostRadarChart } from "./OrganicPostRadarChart";

type Props = {
  competitorId: string;
  postId: string;
  initialAnalysis: OrganicPostPreviewAnalysis | null;
  initialComputedAt: string | null;
  initialQuota: OrganicPostAnalysisQuota | null;
  onAnalysisSaved: (analysis: OrganicPostPreviewAnalysis, quota: OrganicPostAnalysisQuota) => void;
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
  delayMs = 0,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  delayMs?: number;
}) {
  return (
    <Reveal delayMs={delayMs} className={`${aiGlassCardClass} p-3.5`}>
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-[12px] leading-relaxed text-slate-700">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--rival-success)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function AnalysisResults({
  analysis,
  animateChart,
}: {
  analysis: OrganicPostPreviewAnalysis;
  animateChart: boolean;
}) {
  return (
    <div className="space-y-3">
      <OrganicPostRadarChart scores={analysis.organic_scores} animate={animateChart} />

      <AnalysisCard title="Content style" icon={<BarChart3 className="h-3.5 w-3.5" />} delayMs={80}>
        <p className="text-[12px] font-semibold text-slate-900">{analysis.content_style.label}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{analysis.content_style.description}</p>
      </AnalysisCard>

      <AnalysisCard title="Hook analysis" icon={<Lightbulb className="h-3.5 w-3.5" />} delayMs={120}>
        <p className="text-[12px] leading-relaxed text-slate-700">{analysis.hook_analysis}</p>
      </AnalysisCard>

      <AnalysisCard title="Engagement drivers" icon={<Target className="h-3.5 w-3.5" />} delayMs={160}>
        <BulletList items={analysis.engagement_drivers} />
      </AnalysisCard>

      <AnalysisCard title="Audience signals" icon={<Users className="h-3.5 w-3.5" />} delayMs={200}>
        <BulletList items={analysis.audience_signals} />
      </AnalysisCard>

      <AnalysisCard title="Format notes" icon={<BarChart3 className="h-3.5 w-3.5" />} delayMs={240}>
        <p className="text-[12px] leading-relaxed text-slate-700">{analysis.format_notes}</p>
        <p className="mt-2 text-[11px] font-medium text-slate-500">
          Brand voice: <span className="text-slate-700">{analysis.brand_voice}</span>
        </p>
      </AnalysisCard>

      <AnalysisCard title="Why it works" icon={<Sparkles className="h-3.5 w-3.5" />} delayMs={280}>
        <BulletList items={analysis.why_it_works} />
      </AnalysisCard>

      {analysis.risk_flags.length > 0 ? (
        <AnalysisCard title="Risk flags" icon={<AlertTriangle className="h-3.5 w-3.5" />} delayMs={320}>
          <BulletList items={analysis.risk_flags} />
        </AnalysisCard>
      ) : null}

      <AnalysisCard title="Replication playbook" icon={<Lightbulb className="h-3.5 w-3.5" />} delayMs={360}>
        <BulletList items={analysis.replication_playbook} />
      </AnalysisCard>
    </div>
  );
}

export function OrganicPostAnalysisPanel({
  competitorId,
  postId,
  initialAnalysis,
  initialComputedAt,
  initialQuota,
  onAnalysisSaved,
}: Props) {
  const [analysis, setAnalysis] = useState<OrganicPostPreviewAnalysis | null>(initialAnalysis);
  const [quota, setQuota] = useState<OrganicPostAnalysisQuota | null>(initialQuota);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animateChart, setAnimateChart] = useState(Boolean(initialAnalysis));

  useEffect(() => {
    setAnalysis(initialAnalysis);
    setQuota(initialQuota);
    setAnimateChart(Boolean(initialAnalysis));
  }, [postId, initialAnalysis, initialQuota]);

  const runAnalysis = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    setAnimateChart(false);
    try {
      const res = await fetch(
        `/api/competitor/${encodeURIComponent(competitorId)}/organic/posts/${encodeURIComponent(postId)}/ai-analysis`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        analysis?: OrganicPostPreviewAnalysis;
        quota?: OrganicPostAnalysisQuota;
        error?: string;
      };

      if (!json.ok || !json.analysis) {
        setError(json.error ?? "Analysis failed");
        return;
      }

      setAnalysis(json.analysis);
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
  }, [competitorId, onAnalysisSaved, postId, quota, running]);

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
          <AnalysisResults analysis={analysis} animateChart={animateChart} />
        ) : null}

        {!running && !analysis ? (
          <div className={`${aiGlassShellClass} p-4`}>
            <p className="text-[12px] leading-relaxed text-slate-600">
              Click{" "}
              <strong className="font-semibold text-slate-900">Run AI Analysis</strong> to generate engagement
              drivers, audience signals, format notes, and a replication playbook for this organic post.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { OrganicPostAnalysisQuota };
