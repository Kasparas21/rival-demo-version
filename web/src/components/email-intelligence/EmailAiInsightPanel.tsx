"use client";

import {
  AlertCircle,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  Loader2,
  MousePointerClick,
  Sparkles,
  Tag,
  Target,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { alertGlassChipBaseClass } from "@/components/competitor/alerts/alert-ui-styles";
import { MAX_AI_ANALYSIS_ATTEMPTS } from "@/lib/email-intelligence/constants";
import {
  emailDeepAnalysisSchema,
  emailNeedsDeepAnalysis,
  type EmailDeepAnalysis,
} from "@/lib/email-intelligence/email-deep-analysis-types";
import type { CompetitorEmailRow } from "@/lib/email-intelligence/types";
import {
  aiGlassCardClass,
  aiGlassInsetClass,
  aiGlassShellClass,
  aiSectionLabelClass,
} from "@/lib/ad-detail/ad-preview-analysis-styles";
import { cn } from "@/lib/utils";

import {
  angleBadgeClass,
  emailTypeBadgeClass,
  formatEmailType,
  parseOffers,
  truncateDisplayText,
} from "./email-intelligence-ui";

type EmailDetailResponse = {
  email?: CompetitorEmailRow;
  error?: string;
};

function emailAnalysisFailed(email: CompetitorEmailRow): boolean {
  return Boolean(
    email.ai_analysis_error ||
      (!email.ai_processed_at && (email.ai_analysis_attempts ?? 0) >= MAX_AI_ANALYSIS_ATTEMPTS),
  );
}

function emailAnalysisPending(email: CompetitorEmailRow): boolean {
  return !email.ai_processed_at && !emailAnalysisFailed(email);
}

function parseDeepAnalysis(email: CompetitorEmailRow): EmailDeepAnalysis | null {
  if (!email.ai_deep_analysis) return null;
  const parsed = emailDeepAnalysisSchema.safeParse(email.ai_deep_analysis);
  return parsed.success ? parsed.data : null;
}

function AnalysisCard({
  title,
  icon,
  children,
  highlight = false,
  compact = false,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  highlight?: boolean;
  compact?: boolean;
}) {
  const shell = highlight
    ? "rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/60 p-2.5 ring-1 ring-indigo-100/60"
    : `${aiGlassCardClass} ${compact ? "p-2.5" : "p-3.5"}`;

  return (
    <div className={shell}>
      <div
        className={cn(
          "mb-1.5 flex items-center gap-1.5 font-semibold text-slate-800",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-lg border border-white/80 bg-white/80 text-[#343434] shadow-sm",
            compact ? "h-5 w-5" : "h-6 w-6",
          )}
        >
          {icon}
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}

function BulletList({
  items,
  className,
  compact = false,
}: {
  items: string[];
  className?: string;
  compact?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ul
      className={cn(
        "space-y-1 leading-relaxed text-slate-700",
        compact ? "text-[11px]" : "space-y-1.5 text-[12px]",
        className,
      )}
    >
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ConfidenceBadge({ level }: { level: EmailDeepAnalysis["confidence"] }) {
  const styles =
    level === "high"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : level === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", styles)}>
      {level} confidence
    </span>
  );
}

function ExpandableText({
  text,
  maxChars = 180,
  className,
}: {
  text: string;
  maxChars?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncate = text.length > maxChars;
  const display = expanded || !needsTruncate ? text : truncateDisplayText(text, maxChars);

  return (
    <div>
      <p className={cn("leading-relaxed text-slate-700", className)}>{display}</p>
      {needsTruncate ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-700 hover:underline"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

function ShallowInsightFallback({ email, compact }: { email: CompetitorEmailRow; compact: boolean }) {
  const offers = parseOffers(email.ai_offers);
  return (
    <>
      {email.ai_summary ? (
        <ExpandableText
          text={email.ai_summary}
          maxChars={compact ? 140 : 200}
          className={compact ? "text-[11px]" : "text-[13px]"}
        />
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {email.email_type ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
              emailTypeBadgeClass(email.email_type),
            )}
          >
            <Tag className="h-3 w-3" />
            {formatEmailType(email.email_type)}
          </span>
        ) : null}
        {email.ai_angle ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1",
              angleBadgeClass(email.ai_angle),
            )}
          >
            <Target className="h-3 w-3" />
            {email.ai_angle.replace(/_/g, " ")}
          </span>
        ) : null}
      </div>
      {offers.length > 0 ? (
        <div className="mt-2">
          <p className={aiSectionLabelClass}>Offers</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {offers.map((offer, i) => (
              <span
                key={`${offer.type}-${offer.value}-${i}`}
                className={cn(
                  alertGlassChipBaseClass,
                  "border-emerald-200/80 bg-emerald-50/95 text-[10px] text-emerald-900",
                )}
              >
                {offer.value}
                {offer.code ? ` · ${offer.code}` : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {email.ai_cta ? (
        <p className="mt-2 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-500">CTA:</span> {truncateDisplayText(email.ai_cta, 100)}
        </p>
      ) : null}
    </>
  );
}

function DeepInsightContent({
  deep,
  email,
  compact,
}: {
  deep: EmailDeepAnalysis;
  email: CompetitorEmailRow;
  compact: boolean;
}) {
  const offers = parseOffers(deep.ai_offers.length > 0 ? deep.ai_offers : email.ai_offers);

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3")}>
      <AnalysisCard
        title="Executive summary"
        icon={<Brain className="h-3.5 w-3.5" />}
        highlight
        compact={compact}
      >
        <ExpandableText
          text={deep.executive_summary}
          maxChars={compact ? 160 : 220}
          className={compact ? "text-[11px]" : "text-[12px]"}
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ConfidenceBadge level={deep.confidence} />
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600">
            {deep.funnel_stage.replace(/_/g, " ")} funnel
          </span>
        </div>
      </AnalysisCard>

      <AnalysisCard title="Subject line" icon={<Sparkles className="h-3.5 w-3.5" />} compact={compact}>
        <p className={cn("font-medium text-slate-800", compact ? "text-[11px]" : "text-[12px]")}>
          {deep.subject_line.hook}
        </p>
        {deep.subject_line.tactics.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {deep.subject_line.tactics.slice(0, compact ? 3 : 5).map((tactic) => (
              <span
                key={tactic}
                className="rounded-full border border-indigo-100 bg-indigo-50/80 px-2 py-0.5 text-[10px] font-medium text-indigo-800"
              >
                {tactic}
              </span>
            ))}
          </div>
        ) : null}
        {deep.preheader_role ? (
          <p className="mt-1.5 text-[10px] text-slate-500">
            <span className="font-semibold">Preheader:</span>{" "}
            {truncateDisplayText(deep.preheader_role, compact ? 80 : 120)}
          </p>
        ) : null}
      </AnalysisCard>

      <AnalysisCard title="Audience" icon={<Users className="h-3.5 w-3.5" />} compact={compact}>
        <BulletList items={deep.audience_signals} compact={compact} />
      </AnalysisCard>

      <AnalysisCard title="Persuasion" icon={<Zap className="h-3.5 w-3.5" />} compact={compact}>
        <BulletList items={deep.persuasion_triggers.slice(0, compact ? 3 : 5)} compact={compact} />
        {deep.urgency_tactics.length > 0 ? (
          <p className="mt-1.5 text-[10px] text-slate-500">
            Urgency: {deep.urgency_tactics.join(" · ")}
          </p>
        ) : null}
      </AnalysisCard>

      <AnalysisCard title="Copy & CTA" icon={<BookOpen className="h-3.5 w-3.5" />} compact={compact}>
        <p className={cn("text-slate-800", compact ? "text-[11px]" : "text-[12px]")}>
          {truncateDisplayText(deep.copy_structure.hook, compact ? 100 : 140)}
        </p>
        <div className={cn(aiGlassInsetClass, "mt-2 flex items-start gap-2 p-2")}>
          <MousePointerClick className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
          <p className="text-[11px] font-medium text-slate-800">
            {truncateDisplayText(deep.copy_structure.cta_pattern, 100)}
          </p>
        </div>
      </AnalysisCard>

      {offers.length > 0 ? (
        <AnalysisCard title="Offers" icon={<Tag className="h-3.5 w-3.5" />} compact={compact}>
          <div className="flex flex-wrap gap-1">
            {offers.map((offer, i) => (
              <span
                key={`${offer.type}-${offer.value}-${i}`}
                className={cn(
                  alertGlassChipBaseClass,
                  "border-emerald-200/80 bg-emerald-50/95 text-[10px] text-emerald-900",
                )}
              >
                {offer.value}
              </span>
            ))}
          </div>
        </AnalysisCard>
      ) : null}

      <AnalysisCard title="What works" icon={<Target className="h-3.5 w-3.5" />} compact={compact}>
        <BulletList items={deep.what_works.slice(0, compact ? 3 : 4)} compact={compact} />
      </AnalysisCard>

      <AnalysisCard title="Adaptation playbook" icon={<Sparkles className="h-3.5 w-3.5" />} compact={compact}>
        <BulletList items={deep.adaptation_playbook} compact={compact} />
      </AnalysisCard>
    </div>
  );
}

export function EmailAiInsightPanel({
  email,
  competitorId,
  onRetryComplete,
  embedded = false,
}: {
  email: CompetitorEmailRow;
  competitorId: string;
  onRetryComplete: (updated: CompetitorEmailRow) => void;
  embedded?: boolean;
}) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const compact = embedded;

  const failed = emailAnalysisFailed(email);
  const pending = emailAnalysisPending(email);
  const upgrading = email.ai_processed_at && emailNeedsDeepAnalysis(email) && !failed;

  const retryAnalysis = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`/api/email-trackers/${competitorId}/retry-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_id: email.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; quotaExceeded?: boolean };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Retry failed");
      }
      const detailRes = await fetch(
        `/api/email-trackers/${competitorId}?email_id=${encodeURIComponent(email.id)}`,
      );
      const detail = (await detailRes.json()) as EmailDetailResponse;
      if (detail.email) {
        onRetryComplete(detail.email);
      }
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  };

  if (failed) {
    return (
      <div className={cn("rounded-xl border border-red-200 bg-red-50/80 p-3", embedded && "rounded-lg")}>
        <div className="flex items-center gap-2 text-[12px] font-medium text-red-800">
          <AlertCircle className="h-4 w-4" />
          Analysis failed
        </div>
        <p className="mt-1.5 text-[11px] text-red-700/90">
          {email.ai_analysis_error ?? "Could not analyze this email after several attempts."}
        </p>
        {retryError ? (
          <p className="mt-1.5 text-[11px] font-medium text-red-800">{retryError}</p>
        ) : null}
        <button
          type="button"
          onClick={() => void retryAnalysis()}
          disabled={retrying}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-red-950 disabled:opacity-60"
        >
          {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Retry analysis
        </button>
      </div>
    );
  }

  if (pending || upgrading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 p-3",
          embedded && "rounded-lg",
        )}
      >
        <div className="flex items-center gap-2 text-[12px] font-medium text-indigo-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          {upgrading ? "Upgrading analysis…" : "Analyzing email with AI…"}
        </div>
        <p className="mt-1.5 text-[11px] text-indigo-700/80">
          {upgrading
            ? "Building a deeper breakdown. This usually takes under a minute."
            : "Summary and angle will appear shortly."}
        </p>
      </div>
    );
  }

  const deep = parseDeepAnalysis(email);

  const content = deep ? (
    <DeepInsightContent deep={deep} email={email} compact={compact} />
  ) : (
    <ShallowInsightFallback email={email} compact={compact} />
  );

  if (embedded) {
    return <div className="space-y-2">{content}</div>;
  }

  return (
    <div className={cn(aiGlassShellClass, "p-4")}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-indigo-700">
            AI analysis
          </p>
          <p className="text-[12px] text-slate-500">Competitive intelligence breakdown</p>
        </div>
      </div>

      {content}
    </div>
  );
}
