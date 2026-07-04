"use client";

import Link from "next/link";

import {
  autopilotGlassCardClass,
  autopilotGlassCardActiveClass,
  autopilotGlassInputClass,
  GlassToggle,
} from "@/components/autopilot/autopilot-glass-ui";
import type { AutopilotBillingMeta, AutopilotSettingsUiState, BrandOption, CompetitorOption } from "@/components/autopilot/use-autopilot-settings";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  } catch {
    return "Europe/London";
  }
}

type AutopilotCompetitorsSectionProps = {
  settings: AutopilotSettingsUiState;
  competitors: CompetitorOption[];
  saving: boolean;
  disabled?: boolean;
  variant?: "modal" | "page";
  onPatch: (body: Record<string, unknown>) => void | Promise<void>;
};

export function AutopilotCompetitorsSection({
  settings,
  competitors,
  saving,
  disabled = false,
  variant = "modal",
  onPatch,
}: AutopilotCompetitorsSectionProps) {
  const isDisabled = disabled || saving || !settings.enabled;
  const watchAll = !settings.watch_competitor_ids || settings.watch_competitor_ids.length === 0;
  const labelClass = variant === "page" ? "text-xs font-medium text-[#6B7280] uppercase tracking-wide" : "text-[12px] font-semibold text-[#1a1a2e]";
  const textClass = variant === "page" ? "text-sm" : "text-[11px] text-[#71717a]";

  return (
    <div>
      <div className={labelClass}>Watched competitors</div>
      {variant === "modal" ? (
        <p className={`mt-0.5 ${textClass}`}>All tracked, or pick specific ones.</p>
      ) : null}
      <label
        className={
          variant === "page" ? "flex items-center gap-2 text-sm mb-2 mt-2" : "mt-2 flex items-center gap-2.5"
        }
      >
        <input
          type="checkbox"
          checked={watchAll}
          disabled={isDisabled}
          onChange={(e) => {
            const watch_competitor_ids = e.target.checked ? null : competitors.slice(0, 1).map((c) => c.id);
            void onPatch({ watch_competitor_ids });
          }}
          className="h-3.5 w-3.5 rounded border-[#d4d4d8] accent-emerald-500"
        />
        <span className={variant === "page" ? textClass : "text-[12px] font-medium text-[#3f3f46]"}>All competitors</span>
      </label>
      {!watchAll ? (
        <div
          className={
            variant === "page"
              ? "max-h-40 overflow-y-auto space-y-1 border border-[#E5E7EB] rounded-lg p-2"
              : "mt-2 max-h-28 overflow-y-auto space-y-0.5 rounded-xl border border-white/50 bg-white/35 p-2 backdrop-blur-sm"
          }
        >
          {competitors.map((c) => (
            <label key={c.id} className={`flex items-center gap-2 ${variant === "page" ? textClass : "text-[12px] text-[#3f3f46]"}`}>
              <input
                type="checkbox"
                checked={settings.watch_competitor_ids?.includes(c.id) ?? false}
                disabled={isDisabled}
                onChange={(e) => {
                  const set = new Set(settings.watch_competitor_ids ?? []);
                  if (e.target.checked) set.add(c.id);
                  else set.delete(c.id);
                  void onPatch({ watch_competitor_ids: [...set] });
                }}
                className="h-3.5 w-3.5 rounded border-[#d4d4d8] accent-emerald-500"
              />
              {c.name}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type AutopilotQuietHoursSectionProps = {
  settings: AutopilotSettingsUiState;
  saving: boolean;
  disabled?: boolean;
  variant?: "modal" | "page";
  onPatch: (body: Record<string, unknown>) => void | Promise<void>;
};

export function AutopilotQuietHoursSection({
  settings,
  saving,
  disabled = false,
  variant = "modal",
  onPatch,
}: AutopilotQuietHoursSectionProps) {
  const isDisabled = disabled || saving || !settings.enabled;
  const labelClass = variant === "page" ? "text-xs text-[#6B7280]" : "text-[11px] font-medium text-[#52525b]";
  const selectClass =
    variant === "page"
      ? "w-full mt-1 rounded-lg border border-[#E5E7EB] px-2 py-2 text-sm"
      : "w-full rounded-lg border border-white/55 bg-white/45 px-2 py-1.5 text-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none backdrop-blur-sm focus:border-indigo-300/60 focus:ring-1 focus:ring-indigo-400/20";

  return (
    <div>
      <div className={variant === "page" ? "" : "text-[12px] font-semibold text-[#1a1a2e]"}>Quiet hours</div>
      <p className={variant === "page" ? "text-xs text-[#6B7280] mt-1" : "mt-0.5 text-[10px] leading-snug text-[#71717a]"}>
        Alerts during quiet hours are delivered after they end.
      </p>
      <div className={variant === "page" ? "grid grid-cols-3 gap-2 mt-2" : "mt-2 grid grid-cols-3 gap-2"}>
        <div>
          <label className={labelClass}>Start</label>
          <select
            className={selectClass}
            value={settings.watch_quiet_hours.start}
            disabled={isDisabled}
            onChange={(e) => {
              const watch_quiet_hours = { ...settings.watch_quiet_hours, start: Number(e.target.value) };
              void onPatch({ watch_quiet_hours });
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
          <label className={labelClass}>End</label>
          <select
            className={selectClass}
            value={settings.watch_quiet_hours.end}
            disabled={isDisabled}
            onChange={(e) => {
              const watch_quiet_hours = { ...settings.watch_quiet_hours, end: Number(e.target.value) };
              void onPatch({ watch_quiet_hours });
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
          <label className={labelClass}>Timezone</label>
          <input
            className={selectClass}
            value={settings.watch_quiet_hours.timezone || browserTimezone()}
            disabled={isDisabled}
            onChange={(e) => {
              const watch_quiet_hours = { ...settings.watch_quiet_hours, timezone: e.target.value };
              void onPatch({ watch_quiet_hours });
            }}
          />
        </div>
      </div>
    </div>
  );
}

type AutopilotAutoReportSectionProps = {
  settings: AutopilotSettingsUiState;
  billing: AutopilotBillingMeta | null;
  brands: BrandOption[];
  saving: boolean;
  variant?: "modal" | "page";
  onPatch: (body: Record<string, unknown>) => void | Promise<void>;
};

export function AutopilotAutoReportSection({
  settings,
  billing,
  brands,
  saving,
  variant = "modal",
  onPatch,
}: AutopilotAutoReportSectionProps) {
  const isDisabled = saving || !settings.enabled;
  const canReports = billing?.canReports ?? false;

  if (variant === "modal") {
    return (
      <div
        className={cn(
          autopilotGlassCardClass,
          "p-3.5",
          settings.report_enabled && canReports && autopilotGlassCardActiveClass,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-semibold text-[#1a1a2e]">Auto-report</h3>
            <p className="mt-0.5 text-[11px] text-[#71717a]">
              {canReports ? "Monthly client-ready reports" : "Requires Pro or Agency"}
            </p>
          </div>
          <GlassToggle
            size="sm"
            enabled={settings.report_enabled}
            disabled={isDisabled || !canReports}
            onChange={(v) => void onPatch({ report_enabled: v })}
          />
        </div>
        {canReports && settings.report_enabled ? (
          <div className="mt-3 space-y-2 border-t border-white/50 pt-3">
            <label className="block text-[11px] font-medium text-[#52525b]">
              Day of month
              <select
                className={cn(autopilotGlassInputClass, "mt-1")}
                value={settings.report_day_of_month}
                disabled={isDisabled}
                onChange={(e) => void onPatch({ report_day_of_month: Number(e.target.value) })}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            {brands.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[12px] font-medium text-[#52525b]">Workspaces</p>
                {brands.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-[12px] text-[#3f3f46]">
                    <input
                      type="checkbox"
                      checked={settings.report_workspaces[b.id] !== false}
                      disabled={isDisabled}
                      onChange={(e) => {
                        const report_workspaces = { ...settings.report_workspaces, [b.id]: e.target.checked };
                        void onPatch({ report_workspaces });
                      }}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d8]"
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            ) : null}
            {billing?.isAgency ? (
              <Link
                href="/dashboard/settings/autopilot#branding"
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Agency branding
                <span aria-hidden>→</span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
