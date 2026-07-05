"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { EmailPreviewIframe, EmailPreviewLoading } from "@/lib/email-intelligence/email-preview-iframe";
import type { CompetitorEmailRow } from "@/lib/email-intelligence/types";
import { cn } from "@/lib/utils";

import { EmailAiInsightPanel } from "./EmailAiInsightPanel";
import {
  angleBadgeClass,
  cleanPreheaderForDisplay,
  emailFromLabel,
  emailTypeBadgeClass,
  estimatePlainBodyLength,
  formatEmailType,
  formatReceivedDateTime,
  formatRelativeTime,
  parseOffers,
} from "./email-intelligence-ui";

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <span className="shrink-0 text-[12px] text-slate-500">{label}</span>
      <div className="min-w-0 text-right text-[12px] leading-snug text-slate-900">{value}</div>
    </div>
  );
}

function EmailDetailsTab({ email }: { email: CompetitorEmailRow }) {
  const offers = parseOffers(email.ai_offers);
  const subject = email.subject?.trim() || "(no subject)";
  const preheader = cleanPreheaderForDisplay(email.preview_text);
  const bodyLength = estimatePlainBodyLength(email);
  const hasHtml = Boolean(email.html_body?.trim());

  return (
    <div className="py-1">
      <DetailRow
        label="From"
        value={<span className="font-medium">{emailFromLabel(email)}</span>}
      />
      <DetailRow
        label="Received"
        value={
          email.received_at ? (
            <span className="font-medium">
              {formatReceivedDateTime(email.received_at)}
              <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                {formatRelativeTime(email.received_at)}
              </span>
            </span>
          ) : null
        }
      />
      <DetailRow
        label="Subject"
        value={<span className="text-left font-medium leading-snug">{subject}</span>}
      />
      {preheader.raw ? (
        <DetailRow
          label="Preheader"
          value={
            <span className="text-left text-[11px] font-normal leading-relaxed text-slate-600">
              {preheader.text}
            </span>
          }
        />
      ) : null}
      <DetailRow
        label="Format"
        value={<span className="font-medium">{hasHtml ? "HTML email" : "Plain text"}</span>}
      />
      {bodyLength != null ? (
        <DetailRow
          label="Body length"
          value={<span className="font-medium">~{bodyLength.toLocaleString()} chars</span>}
        />
      ) : null}
      {email.email_type ? (
        <DetailRow
          label="Type"
          value={
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
                emailTypeBadgeClass(email.email_type),
              )}
            >
              {formatEmailType(email.email_type)}
            </span>
          }
        />
      ) : null}
      {email.ai_cta ? (
        <DetailRow label="Main CTA" value={<span className="font-medium">{email.ai_cta}</span>} />
      ) : null}
      {email.ai_angle ? (
        <DetailRow
          label="Angle"
          value={
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ring-1",
                angleBadgeClass(email.ai_angle),
              )}
            >
              {email.ai_angle.replace(/_/g, " ")}
            </span>
          }
        />
      ) : null}
      {email.esp_detected && email.esp_detected !== "Unknown" ? (
        <DetailRow label="ESP" value={<span className="font-medium">{email.esp_detected}</span>} />
      ) : null}
      {offers.length > 0 ? (
        <DetailRow
          label="Offers"
          value={
            <div className="flex flex-col items-end gap-1">
              {offers.map((offer, i) => (
                <span key={`${offer.type}-${i}`} className="font-medium text-emerald-800">
                  {offer.value}
                  {offer.code ? ` · ${offer.code}` : ""}
                </span>
              ))}
            </div>
          }
        />
      ) : null}
      {email.ai_summary ? (
        <DetailRow
          label="Summary"
          value={
            <span className="block text-left text-[11px] font-normal leading-relaxed text-slate-600">
              {email.ai_summary}
            </span>
          }
        />
      ) : null}
    </div>
  );
}

export function EmailDetailPane({
  email,
  competitorId,
  onEmailUpdated,
  inDrawer = false,
  previewLoading = false,
}: {
  email: CompetitorEmailRow;
  competitorId: string;
  onEmailUpdated: (updated: CompetitorEmailRow) => void;
  inDrawer?: boolean;
  previewLoading?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "ai">("details");
  const hasDeepAnalysis = Boolean(email.ai_deep_analysis);

  return (
    <div className="flex h-full min-h-0 flex-row">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {previewLoading ? (
            <EmailPreviewLoading />
          ) : email.html_body ? (
            <EmailPreviewIframe
              key={email.id}
              title={email.subject ?? "Email preview"}
              htmlBody={email.html_body}
            />
          ) : (
            <pre className="whitespace-pre-wrap p-6 text-[13px] leading-relaxed text-slate-700">
              {email.plain_text || "No body content"}
            </pre>
          )}
        </div>
      </div>

      <div className="flex min-h-0 w-[min(100%,400px)] flex-shrink-0 flex-col border-l border-slate-200 bg-white">
        {!inDrawer ? (
          <div className="shrink-0 border-b border-slate-100 px-4 py-3">
            <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-slate-900">
              {email.subject?.trim() || "(no subject)"}
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              {emailFromLabel(email)}
              {email.received_at ? ` · ${formatRelativeTime(email.received_at)}` : null}
            </p>
          </div>
        ) : null}

        <div className="flex shrink-0 border-b border-slate-100 px-4">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={cn(
              "border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors",
              activeTab === "details"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors",
              activeTab === "ai"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            AI Analysis
            {!hasDeepAnalysis && email.ai_processed_at ? (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-800">
                New
              </span>
            ) : null}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {activeTab === "details" ? <EmailDetailsTab email={email} /> : null}
          {activeTab === "ai" ? (
            <div className="p-3">
              <EmailAiInsightPanel
                email={email}
                competitorId={competitorId}
                onRetryComplete={onEmailUpdated}
                embedded
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
