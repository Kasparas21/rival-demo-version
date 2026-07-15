"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail, MoreHorizontal, Radio, Search } from "lucide-react";

import {
  alertGlassButtonClass,
  alertGlassPanelClass,
} from "@/components/competitor/alerts/alert-ui-styles";
import { DemoEmailDetailDrawer } from "@/components/demo/demo-email-detail-drawer";
import { EmailMarketingInsights } from "@/components/email-intelligence/EmailMarketingInsights";
import {
  emailTypeBadgeClass,
  formatEmailType,
} from "@/components/email-intelligence/email-intelligence-ui";
import { DemoPillFilters, DemoSectionHeader } from "@/components/landing/hero-variant-b-demo/chrome";
import {
  buildDemoEmailInsights,
  DEMO_EMAIL_TRACKER_ADDRESS,
  DEMO_EMAILS,
} from "@/lib/demo/demo-email-insights-payload";
import { cn } from "@/lib/utils";

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "promotional", label: "Promotional" },
  { id: "nurture", label: "Nurture" },
  { id: "cart_abandonment", label: "Cart" },
] as const;

function DemoEmailTrackerBar({ competitorName }: { competitorName: string }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_EMAIL_TRACKER_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={cn(alertGlassPanelClass, "px-4 py-3")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            <Radio className="h-3 w-3" />
            Tracking active
          </span>
          <p className="text-[12px] text-slate-600">
            Subscribe on {competitorName}&apos;s site with this address
          </p>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-xl lg:justify-end">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 font-mono text-[11px] text-slate-800">
            {DEMO_EMAIL_TRACKER_ADDRESS}
          </code>
          <button
            type="button"
            onClick={() => void copyAddress()}
            className={cn(
              alertGlassButtonClass,
              "inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-[12px] font-semibold",
            )}
            aria-label="Copy tracking address"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            Copy
          </button>
          <button
            type="button"
            disabled
            className={cn(alertGlassButtonClass, "inline-flex h-9 w-9 items-center justify-center p-0 opacity-60")}
            aria-label="Tracker options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DemoEmailInboxView({ competitorName }: { competitorName: string }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [drawerEmailId, setDrawerEmailId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const emails = useMemo(
    () => DEMO_EMAILS.filter((e) => typeFilter === "all" || e.type === typeFilter),
    [typeFilter],
  );

  return (
    <div className="space-y-5">
      <DemoSectionHeader
        overline="Email Marketing"
        title={`Email · ${competitorName}`}
        description="Captured newsletters and promos with AI summaries, offers, and marketing angles."
      />
      <DemoEmailTrackerBar competitorName={competitorName} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-[#64748b]">{DEMO_EMAILS.length} captured emails</p>
        <button type="button" className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white">
          Sync
        </button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
        <input
          readOnly
          placeholder="Search subject, sender, offer code…"
          className="w-full rounded-xl border border-[#e5e7eb] bg-white py-2.5 pl-10 pr-3 text-[13px]"
        />
      </div>
      <DemoPillFilters options={[...TYPE_FILTERS]} value={typeFilter} onChange={setTypeFilter} />
      <div className="divide-y divide-[#e5e7eb] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
        {emails.map((email) => (
          <button
            key={email.id}
            type="button"
            onClick={() => setDrawerEmailId(email.id)}
            className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/80 ${email.unread ? "bg-sky-50/40" : "bg-white"}`}
          >
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[#64748b]">
              <Mail className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`truncate text-[13px] ${email.unread ? "font-semibold text-[#111827]" : "font-medium text-[#334155]"}`}
                >
                  {email.subject}
                </p>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                    emailTypeBadgeClass(email.type),
                  )}
                >
                  {formatEmailType(email.type)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#64748b]">
                {email.fromName} · {email.fromEmail}
              </p>
              <p className="mt-1 line-clamp-1 text-[12px] text-[#64748b]">{email.preview}</p>
            </div>
            <span className="shrink-0 text-[11px] text-[#94a3b8]">{email.receivedAt}</span>
          </button>
        ))}
      </div>

      <DemoEmailDetailDrawer
        emailId={drawerEmailId}
        isSaved={drawerEmailId ? savedIds.has(drawerEmailId) : false}
        onToggleSave={
          drawerEmailId
            ? () => {
                setSavedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(drawerEmailId)) next.delete(drawerEmailId);
                  else next.add(drawerEmailId);
                  return next;
                });
              }
            : undefined
        }
        onClose={() => setDrawerEmailId(null)}
      />
    </div>
  );
}

export function DemoEmailSavedView({ competitorName }: { competitorName: string }) {
  const saved = DEMO_EMAILS.slice(0, 2);
  const [drawerEmailId, setDrawerEmailId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <DemoSectionHeader overline="Email Marketing" title="Saved emails" />
      <DemoEmailTrackerBar competitorName={competitorName} />
      <div className="space-y-2">
        {saved.map((email) => (
          <button
            key={email.id}
            type="button"
            onClick={() => setDrawerEmailId(email.id)}
            className="w-full rounded-xl border border-[#e5e7eb] bg-white p-4 text-left transition-colors hover:bg-slate-50/80"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-[#111827]">{email.subject}</p>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                  emailTypeBadgeClass(email.type),
                )}
              >
                {formatEmailType(email.type)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#64748b]">{email.fromName}</p>
            <p className="mt-2 text-[12px] text-[#475569]">{email.preview}</p>
          </button>
        ))}
      </div>

      <DemoEmailDetailDrawer
        emailId={drawerEmailId}
        isSaved
        onClose={() => setDrawerEmailId(null)}
      />
    </div>
  );
}

export function DemoEmailInsightsView({ competitorName }: { competitorName: string }) {
  const insights = useMemo(() => buildDemoEmailInsights(), []);

  return (
    <div className="space-y-5">
      <DemoSectionHeader
        overline="Email Marketing"
        title={`Email · ${competitorName}`}
        description="Captured newsletters and promos with AI summaries, offers, and marketing angles."
      />
      <DemoEmailTrackerBar competitorName={competitorName} />
      <EmailMarketingInsights
        competitorId="demo-competitor-a"
        competitorName={competitorName}
        insights={insights}
        readOnly
      />
    </div>
  );
}

export function DemoPaidMediaSettingsView() {
  return (
    <div className="space-y-5">
      <DemoSectionHeader overline="Paid Media" title="Settings" description="Read-only demo configuration." />
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
        <p className="text-[12px] font-medium text-[#475569]">Platforms monitored</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Meta", "Google", "TikTok", "LinkedIn", "Pinterest", "Snapchat"].map((p) => (
            <span
              key={p}
              className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100"
            >
              {p} · active
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
