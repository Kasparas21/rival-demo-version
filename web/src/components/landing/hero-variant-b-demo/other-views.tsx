"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Play,
  Save,
} from "lucide-react";

import { DemoActivityFeedTab } from "@/components/demo/demo-activity-feed-tab";
import {
  DemoAngleMigrationPanel,
  DemoTestingVelocityPanel,
} from "@/components/demo/demo-comparison-panels";
import { DemoThreeMovesPanel } from "@/components/demo/demo-three-moves-panel";
import { DemoCreativeTestsView } from "@/components/demo/demo-creative-tests-view";
import { DemoTimelineView } from "@/components/demo/demo-timeline-view";
import {
  DemoPillFilters,
  DemoSectionHeader,
} from "@/components/landing/hero-variant-b-demo/chrome";
import { DemoStrategyMapView } from "@/components/landing/hero-variant-b-demo/strategy-map-view";
import { getDemoBrandPayload } from "@/lib/demo/demo-brand-payload";
import { buildFrozenCopyVaultAds } from "@/lib/demo/demo-frozen-ads-payload";
import {
  DEMO_ALERTS,
  DEMO_AUDIENCE,
  DEMO_COMPARISON,
  DEMO_COMPETITOR,
  type DemoAd,
} from "@/lib/landing/hero-variant-b-demo-data";

const FUNNEL_STYLES: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  TOF: { bg: "bg-[#eff6ff]", text: "text-[#1d4ed8]", border: "border-[#bfdbfe]", bar: "bg-[#3b82f6]" },
  MOF: { bg: "bg-[#fefce8]", text: "text-[#a16207]", border: "border-[#fde047]", bar: "bg-[#eab308]" },
  BOF: { bg: "bg-[#f0fdf4]", text: "text-[#15803d]", border: "border-[#86efac]", bar: "bg-[#22c55e]" },
};

const DEMO_FORMAT_MIX = [
  { label: "Image", pct: 38 },
  { label: "Video", pct: 34 },
  { label: "Search", pct: 18 },
  { label: "Display", pct: 10 },
] as const;

const COPY_VAULT_PLATFORM_FILTERS = [
  { id: "all", label: "All platforms" },
  { id: "meta", label: "Meta" },
  { id: "google", label: "Google" },
  { id: "tiktok", label: "TikTok" },
  { id: "pinterest", label: "Pinterest" },
] as const;

const COPY_VAULT_FUNNEL_FILTERS = [
  { id: "all", label: "All funnel" },
  { id: "top", label: "TOF" },
  { id: "middle", label: "MOF" },
  { id: "bottom", label: "BOF" },
] as const;

const COPY_VAULT_ANGLE_FILTERS = [
  { id: "all", label: "All angles" },
  { id: "Brand awareness", label: "Brand awareness" },
  { id: "Membership hook", label: "Membership" },
  { id: "Product push", label: "Product push" },
  { id: "Discount urgency", label: "Discount" },
] as const;

const ALERT_TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "New platform", label: "New platform" },
  { id: "Activity spike", label: "Activity spike" },
  { id: "Unread", label: "Unread" },
] as const;

const BUDGET_PLATFORM_LABELS: Record<keyof typeof DEMO_COMPARISON.budgetThem, string> = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

const BUDGET_PLATFORM_COLORS: Record<keyof typeof DEMO_COMPARISON.budgetThem, string> = {
  meta: "#1877F2",
  google: "#34A853",
  tiktok: "#0f172a",
  pinterest: "#E60023",
  snapchat: "#facc15",
};

function Card({
  className = "",
  id,
  children,
}: {
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={`rounded-xl border border-[#e5e7eb] bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

function FunnelBadge({ funnel }: { funnel: string }) {
  const style = FUNNEL_STYLES[funnel] ?? FUNNEL_STYLES.TOF;
  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.bg} ${style.text} ${style.border}`}
    >
      {funnel}
    </span>
  );
}

export function DemoInsightsView({
  subTab,
  competitorName = DEMO_COMPETITOR.name,
  domain,
}: {
  subTab: "strategy-map" | "activity-feed";
  competitorName?: string;
  domain?: string;
}) {
  if (subTab === "activity-feed") {
    return <DemoActivityFeedTab competitorLabel={competitorName} />;
  }
  return <DemoStrategyMapView domain={domain} />;
}

export function DemoTestsTimelineView({
  subTab,
  domain,
}: {
  subTab: "creative-tests" | "timeline" | "landing-pages";
  domain?: string;
}) {
  if (subTab === "timeline") return <DemoTimelineView domain={domain} />;
  if (subTab === "landing-pages") return <LandingPagesView domain={domain} />;
  return <DemoCreativeTestsView domain={domain} />;
}

function LandingPagesView({ domain }: { domain?: string }) {
  const payload = useMemo(() => getDemoBrandPayload(domain), [domain]);
  const [selectedId, setSelectedId] = useState<string>(payload.landingPages[0]?.id ?? "");
  const selected = payload.landingPages.find((p) => p.id === selectedId) ?? payload.landingPages[0];
  const previewAds = payload.ads.slice(0, 3);

  if (!selected) {
    return (
      <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-white px-6 py-12 text-center">
        <p className="text-[13px] text-[#64748b]">No landing pages in this demo dataset.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="w-full shrink-0 space-y-2 lg:w-56">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
          Landing pages
        </p>
        {payload.landingPages.map((page) => {
          const active = page.id === selectedId;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelectedId(page.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                active
                  ? "border-[#4a7fa5] bg-[#eff6ff]"
                  : "border-[#e5e7eb] bg-white hover:bg-[#f8fafc]"
              }`}
            >
              <p className="truncate text-[12px] font-semibold text-[#111827]">{page.url}</p>
              <p className="mt-0.5 text-[10px] text-[#64748b]">{page.ads} linked ads</p>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="mx-auto w-[min(100%,220px)] shrink-0 rounded-[2rem] border-4 border-[#1e293b] bg-[#1e293b] p-2 shadow-lg">
            <div className="overflow-hidden rounded-[1.4rem] bg-white">
              <div className="h-6 bg-[#f8fafc]" />
              <div className="space-y-2 p-3">
                <div className="h-20 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#4a7fa5]" />
                <p className="text-[10px] font-semibold text-[#111827]">{selected.url}</p>
                <p className="text-[9px] text-[#64748b]">{selected.ads} ads point here</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(selected.platforms).map(([platform, count]) => (
                    <span
                      key={platform}
                      className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[8px] font-medium capitalize text-[#475569]"
                    >
                      {platform} {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <Card className="flex-1">
            <p className="text-[13px] font-semibold text-[#111827]">Page preview</p>
            <p className="mt-1 text-[11px] text-[#64748b]">
              Simulated mobile view of the selected landing page and linked ad footprint.
            </p>
          </Card>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold text-[#64748b]">Linked ads</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {previewAds.map((ad) => (
              <div
                key={ad.id}
                className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white"
              >
                <div className="aspect-video w-full" style={{ background: ad.gradient }} />
                <p className="truncate px-2 py-2 text-[11px] font-medium text-[#334155]">
                  {ad.headline}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AudienceView() {
  return (
    <div className="space-y-4">
      <DemoSectionHeader title="Audience profile" description="Inferred from active ad targeting signals." />

      <Card>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a7fa5]">Primary</p>
        <p className="mt-2 text-[15px] font-semibold text-[#111827]">{DEMO_AUDIENCE.primary.title}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-[#64748b]">{DEMO_AUDIENCE.primary.body}</p>
        <p className="mt-3 text-[11px] font-medium text-[#334155]">
          {DEMO_AUDIENCE.primary.adCount} ads in this segment
        </p>
        <ul className="mt-3 space-y-1.5">
          {DEMO_AUDIENCE.primary.signals.map((s) => (
            <li key={s} className="text-[11px] text-[#475569]">
              · {s}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DEMO_AUDIENCE.secondary.map((seg) => (
          <Card key={seg.title}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
              Secondary
            </p>
            <p className="mt-2 text-[13px] font-semibold text-[#111827]">{seg.title}</p>
            <p className="mt-1 text-[11px] text-[#64748b]">{seg.detail}</p>
            <p className="mt-2 text-[11px] font-medium text-[#334155]">{seg.ads} ads</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-[11px] font-semibold text-[#64748b]">Evolution</p>
        <ul className="mt-3 space-y-3">
          {DEMO_AUDIENCE.evolution.map((entry) => (
            <li key={`${entry.date}-${entry.segment}`} className="flex items-start gap-3">
              <span className="w-12 shrink-0 text-[11px] font-medium text-[#94a3b8]">{entry.date}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-[#334155]">{entry.segment}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                  <div className="h-full rounded-full bg-[#4a7fa5]" style={{ width: entry.share }} />
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-[#111827]">{entry.share}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function CopyVaultAdCard({ ad }: { ad: DemoAd }) {
  const [saved, setSaved] = useState(false);
  const funnelLabel =
    ad.funnel === "top" ? "TOF" : ad.funnel === "middle" ? "MOF" : ad.funnel === "bottom" ? "BOF" : "-";

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
      <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: ad.creativeUrl ? undefined : ad.gradient }}>
        {ad.creativeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.creativeUrl} alt="" className="size-full object-cover" />
        ) : null}
        {ad.isVideo ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-black/45 text-white">
              <Play className="ml-0.5 size-4" fill="currentColor" aria-hidden />
            </span>
          </span>
        ) : null}
        <span className="absolute left-2 top-2">
          <FunnelBadge funnel={funnelLabel} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-[12px] font-semibold text-[#111827]">{ad.headline}</p>
        <p className="mt-1 line-clamp-2 text-[11px] text-[#64748b]">{ad.body}</p>
        <p className="mt-2 text-[10px] text-[#94a3b8]">
          {ad.lifespanDays ?? ad.activeDays}d lifespan · {ad.format ?? "Creative"}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setSaved((s) => !s)}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-semibold transition-colors ${
              saved ? "bg-[#1e293b] text-white" : "bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]"
            }`}
          >
            <Save className="size-3.5" aria-hidden />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-white py-2 text-[11px] font-semibold text-[#334155] ring-1 ring-[#e5e7eb] hover:bg-[#f8fafc]"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Open
          </button>
        </div>
      </div>
    </article>
  );
}

function CopyVaultView({ domain }: { domain?: string }) {
  const payload = useMemo(() => getDemoBrandPayload(domain), [domain]);
  const copyVaultAds = useMemo(
    () => (payload.key === "competitor" ? buildFrozenCopyVaultAds(payload.domain) : payload.ads),
    [payload.ads, payload.domain, payload.key],
  );
  const [platform, setPlatform] = useState("all");
  const [funnel, setFunnel] = useState("all");
  const [angle, setAngle] = useState("all");

  const filtered = useMemo(() => {
    return copyVaultAds.filter((ad) => {
      if (platform !== "all" && ad.platform !== platform) return false;
      if (funnel !== "all" && ad.funnel !== funnel) return false;
      if (angle !== "all" && ad.angle !== angle) return false;
      return true;
    });
  }, [platform, funnel, angle, copyVaultAds]);

  return (
    <div className="space-y-4">
      <DemoSectionHeader title="Copy vault" description="Saved hooks and long-running creative angles." />

      <div className="space-y-2">
        <DemoPillFilters
          options={COPY_VAULT_PLATFORM_FILTERS.map((f) => ({ id: f.id, label: f.label }))}
          value={platform}
          onChange={setPlatform}
        />
        <DemoPillFilters
          options={COPY_VAULT_FUNNEL_FILTERS.map((f) => ({ id: f.id, label: f.label }))}
          value={funnel}
          onChange={setFunnel}
        />
        <DemoPillFilters
          options={COPY_VAULT_ANGLE_FILTERS.map((f) => ({ id: f.id, label: f.label }))}
          value={angle}
          onChange={setAngle}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-[#94a3b8]">No ads match the selected filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ad) => (
            <CopyVaultAdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DemoAudienceCopyView({
  subTab,
  domain,
}: {
  subTab: "audience" | "copy-vault";
  domain?: string;
}) {
  if (subTab === "copy-vault") return <CopyVaultView domain={domain} />;
  return <AudienceView />;
}

function StackedBudgetBar({
  label,
  data,
}: {
  label: string;
  data: Record<keyof typeof DEMO_COMPARISON.budgetThem, number>;
}) {
  const platforms = Object.keys(data) as (keyof typeof data)[];
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold text-[#334155]">{label}</p>
      <div className="flex h-5 overflow-hidden rounded-md">
        {platforms.map((p) => (
          <div
            key={p}
            style={{
              width: `${data[p]}%`,
              backgroundColor: BUDGET_PLATFORM_COLORS[p],
            }}
            title={`${BUDGET_PLATFORM_LABELS[p]} ${data[p]}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {platforms.map((p) => (
          <span key={p} className="inline-flex items-center gap-1 text-[10px] text-[#64748b]">
            <span
              className="size-2 rounded-sm"
              style={{ backgroundColor: BUDGET_PLATFORM_COLORS[p] }}
              aria-hidden
            />
            {BUDGET_PLATFORM_LABELS[p]} {data[p]}%
          </span>
        ))}
      </div>
    </div>
  );
}

export function DemoComparisonView({
  workspaceName = DEMO_COMPARISON.youLabel,
  competitorName = DEMO_COMPARISON.themLabel,
}: {
  workspaceName?: string;
  competitorName?: string;
} = {}) {
  return (
    <div className="space-y-5">
      <DemoSectionHeader
        title="Head to head"
        description={`${competitorName} vs ${workspaceName}`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {DEMO_COMPARISON.metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-[11px] text-[#64748b]">{metric.label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <p className="text-[10px] text-[#94a3b8]">{DEMO_COMPARISON.themLabel}</p>
                <p className="text-lg font-bold text-[#111827]">{metric.them}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#94a3b8]">{DEMO_COMPARISON.youLabel}</p>
                <p className="text-lg font-bold text-[#111827]">{metric.you}</p>
              </div>
            </div>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                metric.verdict === "ahead"
                  ? "bg-[#dcfce7] text-[#166534]"
                  : "bg-[#fef3c7] text-[#92400e]"
              }`}
            >
              You&apos;re {metric.verdict}
            </span>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
          Format mix
        </p>
        <div className="mt-3 space-y-3">
          {DEMO_FORMAT_MIX.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-[#334155]">{row.label}</span>
                <span className="font-medium text-[#64748b]">{row.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#f1f5f9]">
                <div className="h-full rounded-full bg-[#64748b]" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card id="comparison-budget-split" className="scroll-mt-36 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
          Budget allocation
        </p>
        <StackedBudgetBar label={competitorName} data={DEMO_COMPARISON.budgetThem} />
        <StackedBudgetBar label={workspaceName} data={DEMO_COMPARISON.budgetYou} />
      </Card>

      <DemoThreeMovesPanel workspaceName={workspaceName} competitorName={competitorName} />
      <DemoTestingVelocityPanel workspaceName={workspaceName} competitorName={competitorName} />
      <DemoAngleMigrationPanel workspaceName={workspaceName} competitorName={competitorName} />
    </div>
  );
}

export function DemoAlertsView() {
  const [filter, setFilter] = useState("all");
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  const alerts = useMemo(() => {
    return DEMO_ALERTS.map((alert) => ({
      ...alert,
      unread: alert.unread && !readIds.has(alert.id),
    })).filter((alert) => {
      if (filter === "all") return true;
      if (filter === "Unread") return alert.unread;
      return alert.type === filter;
    });
  }, [filter, readIds]);

  const markRead = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="space-y-4">
      <DemoSectionHeader
        title="Alerts"
        description="Competitive moves detected from scrape diffs."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-2.5 py-1 text-[10px] font-semibold text-[#92400e]">
            <Bell className="size-3" aria-hidden />
            {DEMO_ALERTS.filter((a) => a.unread && !readIds.has(a.id)).length} unread
          </span>
        }
      />

      <DemoPillFilters
        options={ALERT_TYPE_FILTERS.map((f) => ({ id: f.id, label: f.label }))}
        value={filter}
        onChange={setFilter}
      />

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white px-6 py-12 text-center">
          <p className="text-[13px] font-semibold text-[#334155]">No alerts match this filter</p>
          <p className="mt-1 text-[11px] text-[#94a3b8]">Try a different filter or check back after the next scrape.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <button
                type="button"
                onClick={() => markRead(alert.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  alert.unread
                    ? "border-[#bfdbfe] bg-[#eff6ff] hover:bg-[#dbeafe]"
                    : "border-[#e5e7eb] bg-white hover:bg-[#f8fafc]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {alert.unread ? (
                        <span className="size-2 shrink-0 rounded-full bg-[#2563eb]" aria-hidden />
                      ) : null}
                      <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-medium text-[#64748b]">
                        {alert.type}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] font-semibold text-[#111827]">{alert.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#64748b]">{alert.detail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-[#94a3b8]">{alert.daysAgo}d ago</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
