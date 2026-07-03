"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { WatchSensitivityCards } from "@/components/autopilot/WatchSensitivityCards";
import {
  AutopilotHistoryList,
  type AutopilotHistoryItem,
} from "@/components/autopilot/AutopilotHistoryList";
import type { AutopilotSettingsRow, ReportBranding, WatchSensitivity } from "@/lib/autopilot/types";

type BrandOption = { id: string; name: string };

type CompetitorOption = { id: string; name: string };

type BillingMeta = {
  planTier: string;
  canReports: boolean;
  canBrief: boolean;
  isAgency: boolean;
};

type SettingsResponse = AutopilotSettingsRow & {
  slack_webhook_configured?: boolean;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  } catch {
    return "Europe/London";
  }
}

export function AutopilotSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [billing, setBilling] = useState<BillingMeta | null>(null);
  const [slackInput, setSlackInput] = useState("");
  const [history, setHistory] = useState<AutopilotHistoryItem[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorOption[]>([]);
  const [previewBusy, setPreviewBusy] = useState<string | null>(null);
  const [slackTestBusy, setSlackTestBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, historyRes, brandsRes, compsRes] = await Promise.all([
        fetch("/api/autopilot/settings", { credentials: "include" }),
        fetch("/api/autopilot/history", { credentials: "include" }),
        fetch("/api/account/brands", { credentials: "include" }),
        fetch("/api/account/saved-competitors", { credentials: "include" }),
      ]);

      const settingsJson = (await settingsRes.json()) as {
        ok?: boolean;
        settings?: SettingsResponse;
        billing?: BillingMeta;
        error?: string;
      };
      if (!settingsRes.ok || !settingsJson.ok || !settingsJson.settings) {
        throw new Error(
          typeof settingsJson.error === "string" ? settingsJson.error : "Could not load autopilot settings",
        );
      }
      setSettings(settingsJson.settings);
      setBilling(settingsJson.billing ?? null);
      setSlackInput("");

      const historyJson = (await historyRes.json()) as { ok?: boolean; items?: AutopilotHistoryItem[] };
      if (historyJson.ok && historyJson.items) setHistory(historyJson.items);

      const brandsJson = (await brandsRes.json()) as { brands?: { id: string; name: string }[] };
      setBrands((brandsJson.brands ?? []).map((b) => ({ id: b.id, name: b.name })));

      const compsJson = (await compsRes.json()) as {
        competitors?: {
          savedCompetitorDbId?: string;
          id?: string;
          name?: string;
          brand?: { name?: string };
        }[];
      };
      setCompetitors(
        (compsJson.competitors ?? [])
          .map((c) => ({
            id: c.savedCompetitorDbId ?? c.id ?? "",
            name: c.brand?.name?.trim() || c.name?.trim() || "Competitor",
          }))
          .filter((c) => c.id),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      setSaved(false);
      setError(null);
      try {
        const res = await fetch("/api/autopilot/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as { ok?: boolean; settings?: SettingsResponse; error?: string };
        if (!res.ok || !json.ok || !json.settings) {
          throw new Error(typeof json.error === "string" ? json.error : "Save failed");
        }
        setSettings(json.settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const updateBranding = (partial: Partial<ReportBranding>) => {
    if (!settings) return;
    const next: ReportBranding = { ...settings.report_branding, ...partial };
    void patch({ report_branding: next });
    setSettings({ ...settings, report_branding: next });
  };

  const toggleWorkspace = (brandId: string, enabled: boolean) => {
    if (!settings) return;
    const next = { ...settings.report_workspaces, [brandId]: enabled };
    setSettings({ ...settings, report_workspaces: next });
    void patch({ report_workspaces: next });
  };

  const watchAllCompetitors =
    !settings?.watch_competitor_ids || settings.watch_competitor_ids.length === 0;

  if (loading) {
    return <p className="text-sm text-[#6B7280]">loading autopilot settings…</p>;
  }

  if (!settings) {
    return <p className="text-sm text-red-600">{error ?? "settings unavailable"}</p>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          back to settings
        </Link>
        <h1 className="text-2xl font-semibold text-[#111827]">Autopilot</h1>
        <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
          Rival watches your competitors and delivers finished intelligence — alerts with suggested moves,
          and monthly client-ready reports — without you checking in.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-green-700">saved</p> : null}

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <div className="text-sm font-medium text-[#111827]">Autopilot</div>
            <div className="text-xs text-[#6B7280] mt-0.5">master switch for all autopilot outputs</div>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            disabled={saving}
            onChange={(e) => {
              const enabled = e.target.checked;
              setSettings({ ...settings, enabled });
              void patch({ enabled });
            }}
            className="h-5 w-5 rounded border-[#D1D5DB]"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#111827]">Auto-watch</h2>
          <input
            type="checkbox"
            checked={settings.watch_enabled}
            disabled={saving || !settings.enabled}
            onChange={(e) => {
              const watch_enabled = e.target.checked;
              setSettings({ ...settings, watch_enabled });
              void patch({ watch_enabled });
            }}
            className="h-5 w-5 rounded border-[#D1D5DB]"
          />
        </div>

        <div>
          <div className="text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wide">Sensitivity</div>
          <WatchSensitivityCards
            value={settings.watch_sensitivity as WatchSensitivity}
            disabled={saving || !settings.enabled || !settings.watch_enabled}
            onChange={(watch_sensitivity) => {
              setSettings({ ...settings, watch_sensitivity });
              void patch({ watch_sensitivity });
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Channels</div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.watch_channels.email}
              disabled={saving || !settings.enabled}
              onChange={(e) => {
                const watch_channels = { ...settings.watch_channels, email: e.target.checked };
                setSettings({ ...settings, watch_channels });
                void patch({ watch_channels });
              }}
            />
            email
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.watch_channels.slack}
              disabled={saving || !settings.enabled}
              onChange={(e) => {
                const watch_channels = { ...settings.watch_channels, slack: e.target.checked };
                setSettings({ ...settings, watch_channels });
                void patch({ watch_channels });
              }}
            />
            slack
          </label>
          <input
            type="url"
            placeholder={
              settings.slack_webhook_configured ? "webhook saved — paste new URL to replace" : "Slack webhook URL"
            }
            value={slackInput}
            disabled={saving || !settings.enabled}
            onChange={(e) => setSlackInput(e.target.value)}
            onBlur={() => {
              if (slackInput.trim()) void patch({ slack_webhook_url: slackInput.trim() });
            }}
            className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={slackTestBusy || !settings.slack_webhook_configured && !slackInput.trim()}
            onClick={async () => {
              if (slackInput.trim()) await patch({ slack_webhook_url: slackInput.trim() });
              setSlackTestBusy(true);
              try {
                const res = await fetch("/api/autopilot/test-slack", { method: "POST", credentials: "include" });
                const json = (await res.json()) as { ok?: boolean; error?: string };
                if (!json.ok) setError(json.error ?? "Slack test failed");
                else setSaved(true);
              } finally {
                setSlackTestBusy(false);
              }
            }}
            className="text-sm font-medium text-[#2563EB] hover:underline disabled:opacity-50"
          >
            {slackTestBusy ? "sending…" : "send test"}
          </button>
        </div>

        <div>
          <div className="text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wide">Competitors</div>
          <label className="flex items-center gap-2 text-sm mb-2">
            <input
              type="checkbox"
              checked={watchAllCompetitors}
              disabled={saving || !settings.enabled}
              onChange={(e) => {
                const watch_competitor_ids = e.target.checked ? null : competitors.slice(0, 1).map((c) => c.id);
                setSettings({ ...settings, watch_competitor_ids });
                void patch({ watch_competitor_ids });
              }}
            />
            all tracked competitors
          </label>
          {!watchAllCompetitors ? (
            <div className="max-h-40 overflow-y-auto space-y-1 border border-[#E5E7EB] rounded-lg p-2">
              {competitors.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.watch_competitor_ids?.includes(c.id) ?? false}
                    disabled={saving}
                    onChange={(e) => {
                      const set = new Set(settings.watch_competitor_ids ?? []);
                      if (e.target.checked) set.add(c.id);
                      else set.delete(c.id);
                      const watch_competitor_ids = [...set];
                      setSettings({ ...settings, watch_competitor_ids });
                      void patch({ watch_competitor_ids });
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-[#6B7280]">quiet from</label>
            <select
              className="w-full mt-1 rounded-lg border border-[#E5E7EB] px-2 py-2 text-sm"
              value={settings.watch_quiet_hours.start}
              disabled={saving}
              onChange={(e) => {
                const watch_quiet_hours = {
                  ...settings.watch_quiet_hours,
                  start: Number(e.target.value),
                };
                setSettings({ ...settings, watch_quiet_hours });
                void patch({ watch_quiet_hours });
              }}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#6B7280]">quiet until</label>
            <select
              className="w-full mt-1 rounded-lg border border-[#E5E7EB] px-2 py-2 text-sm"
              value={settings.watch_quiet_hours.end}
              disabled={saving}
              onChange={(e) => {
                const watch_quiet_hours = {
                  ...settings.watch_quiet_hours,
                  end: Number(e.target.value),
                };
                setSettings({ ...settings, watch_quiet_hours });
                void patch({ watch_quiet_hours });
              }}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#6B7280]">timezone</label>
            <input
              className="w-full mt-1 rounded-lg border border-[#E5E7EB] px-2 py-2 text-sm"
              value={settings.watch_quiet_hours.timezone || browserTimezone()}
              disabled={saving}
              onChange={(e) => {
                const watch_quiet_hours = {
                  ...settings.watch_quiet_hours,
                  timezone: e.target.value,
                };
                setSettings({ ...settings, watch_quiet_hours });
              }}
              onBlur={() => void patch({ watch_quiet_hours: settings.watch_quiet_hours })}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#111827]">Auto-report</h2>
          <input
            type="checkbox"
            checked={settings.report_enabled}
            disabled={saving || !settings.enabled || !billing?.canReports}
            onChange={(e) => {
              const report_enabled = e.target.checked;
              setSettings({ ...settings, report_enabled });
              void patch({ report_enabled });
            }}
            className="h-5 w-5 rounded border-[#D1D5DB]"
          />
        </div>
        {!billing?.canReports ? (
          <p className="text-xs text-[#6B7280]">requires Pro or Agency</p>
        ) : null}

        <div>
          <label className="text-xs text-[#6B7280]">day of month (1–28)</label>
          <select
            className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
            value={settings.report_day_of_month}
            disabled={saving || !settings.report_enabled}
            onChange={(e) => {
              const report_day_of_month = Number(e.target.value);
              setSettings({ ...settings, report_day_of_month });
              void patch({ report_day_of_month });
            }}
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {brands.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">workspaces</div>
            {brands.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.report_workspaces[b.id] !== false}
                  disabled={saving || !settings.report_enabled}
                  onChange={(e) => toggleWorkspace(b.id, e.target.checked)}
                />
                {b.name}
                <button
                  type="button"
                  className="ml-auto text-xs text-[#2563EB] hover:underline disabled:opacity-50"
                  disabled={previewBusy === b.id}
                  onClick={async () => {
                    setPreviewBusy(b.id);
                    setError(null);
                    try {
                      const res = await fetch("/api/autopilot/report/preview", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ brandId: b.id }),
                      });
                      const json = (await res.json()) as { ok?: boolean; reportUrl?: string; error?: string };
                      if (!res.ok || !json.ok) throw new Error(json.error ?? "Preview failed");
                      if (json.reportUrl) window.open(json.reportUrl, "_blank");
                      void load();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Preview failed");
                    } finally {
                      setPreviewBusy(null);
                    }
                  }}
                >
                  {previewBusy === b.id ? "generating…" : "preview"}
                </button>
              </label>
            ))}
          </div>
        ) : null}

        {billing?.isAgency ? (
          <div className="space-y-3 pt-2 border-t border-[#E5E7EB]">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">agency branding</div>
            <input
              type="url"
              placeholder="logo URL"
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
              value={settings.report_branding.logo_url ?? ""}
              disabled={saving}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  report_branding: { ...settings.report_branding, logo_url: e.target.value || null },
                })
              }
              onBlur={() => updateBranding({ logo_url: settings.report_branding.logo_url })}
            />
            <input
              type="text"
              placeholder="agency name"
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
              value={settings.report_branding.agency_name ?? ""}
              disabled={saving}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  report_branding: { ...settings.report_branding, agency_name: e.target.value || null },
                })
              }
              onBlur={() => updateBranding({ agency_name: settings.report_branding.agency_name })}
            />
            <input
              type="text"
              placeholder="accent color (#2563EB)"
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
              value={settings.report_branding.accent_color ?? ""}
              disabled={saving}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  report_branding: { ...settings.report_branding, accent_color: e.target.value || null },
                })
              }
              onBlur={() => updateBranding({ accent_color: settings.report_branding.accent_color })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.report_branding.hide_powered_by === true}
                disabled={saving}
                onChange={(e) => updateBranding({ hide_powered_by: e.target.checked })}
              />
              hide powered by Rival
            </label>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5 opacity-80">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#111827]">Auto-brief</h2>
          <span className="text-[10px] uppercase tracking-wide bg-[#E5E7EB] text-[#6B7280] px-2 py-0.5 rounded-full">
            coming soon
          </span>
        </div>
        <p className="mt-2 text-xs text-[#6B7280]">weekly AI creative brief concepts — phase 3</p>
        <input type="checkbox" disabled checked={false} className="mt-3 h-5 w-5 opacity-40" />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[#111827] mb-3">History</h2>
        <AutopilotHistoryList items={history} />
      </section>
    </div>
  );
}
