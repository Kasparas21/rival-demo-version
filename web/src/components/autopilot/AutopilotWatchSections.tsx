"use client";

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

function brandWatchEnabled(
  watchWorkspaces: Record<string, boolean>,
  brand: BrandOption,
): boolean {
  const explicit = watchWorkspaces[brand.id];
  return typeof explicit === "boolean" ? explicit : brand.isPrimary === true;
}

type AutopilotClientBrandsSectionProps = {
  settings: AutopilotSettingsUiState;
  brands: BrandOption[];
  saving: boolean;
  disabled?: boolean;
  onPatch: (body: Record<string, unknown>) => void | Promise<void>;
};

/** Agency accounts: choose which client brand workspaces autopilot watches. */
export function AutopilotClientBrandsSection({
  settings,
  brands,
  saving,
  disabled = false,
  onPatch,
}: AutopilotClientBrandsSectionProps) {
  if (brands.length < 2) return null;

  const isDisabled = disabled || saving || !settings.enabled;
  const enabledCount = brands.filter((b) => brandWatchEnabled(settings.watch_workspaces, b)).length;
  const allEnabled = enabledCount === brands.length;

  const patchAll = (on: boolean) => {
    const watch_workspaces = Object.fromEntries(brands.map((b) => [b.id, on]));
    void onPatch({ watch_workspaces });
  };

  const patchOne = (brandId: string, on: boolean) => {
    const watch_workspaces: Record<string, boolean> = {
      ...Object.fromEntries(
        brands.map((b) => [b.id, brandWatchEnabled(settings.watch_workspaces, b)]),
      ),
      [brandId]: on,
    };
    void onPatch({ watch_workspaces });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[12px] font-semibold text-[#1a1a2e]">Client brands</div>
          <p className="mt-0.5 text-[11px] text-[#71717a]">
            {enabledCount === 0
              ? "No brands watched — alerts are paused"
              : allEnabled
                ? `Watching all ${brands.length} brands`
                : `Watching ${enabledCount} of ${brands.length} brands`}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-[#52525b]">
          <input
            type="checkbox"
            checked={allEnabled}
            disabled={isDisabled}
            onChange={(e) => patchAll(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[#d4d4d8] accent-emerald-500"
          />
          All brands
        </label>
      </div>
      <div className="mt-2 space-y-1.5">
        {brands.map((b) => {
          const on = brandWatchEnabled(settings.watch_workspaces, b);
          return (
            <div
              key={b.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 backdrop-blur-sm transition",
                on
                  ? "border-emerald-200/70 bg-emerald-50/45"
                  : "border-white/50 bg-white/30",
              )}
            >
              <div className="min-w-0">
                <span className={cn("block truncate text-[12px] font-medium", on ? "text-[#1a1a2e]" : "text-[#71717a]")}>
                  {b.name}
                  {b.isPrimary ? (
                    <span className="ml-1.5 rounded-full bg-indigo-100/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-600">
                      Primary
                    </span>
                  ) : null}
                </span>
                <span className="block text-[10px] text-[#a1a1aa]">
                  {on ? "Autopilot watching" : "Not watched"}
                </span>
              </div>
              <GlassToggle
                size="sm"
                enabled={on}
                disabled={isDisabled}
                onChange={(v) => patchOne(b.id, v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

type AutopilotCompetitorsSectionProps = {
  settings: AutopilotSettingsUiState;
  competitors: CompetitorOption[];
  brands?: BrandOption[];
  saving: boolean;
  disabled?: boolean;
  variant?: "modal" | "page";
  onPatch: (body: Record<string, unknown>) => void | Promise<void>;
};

export function AutopilotCompetitorsSection({
  settings,
  competitors,
  brands = [],
  saving,
  disabled = false,
  variant = "modal",
  onPatch,
}: AutopilotCompetitorsSectionProps) {
  const isDisabled = disabled || saving || !settings.enabled;
  const watchAll = !settings.watch_competitor_ids || settings.watch_competitor_ids.length === 0;
  const labelClass = variant === "page" ? "text-xs font-medium text-[#6B7280] uppercase tracking-wide" : "text-[12px] font-semibold text-[#1a1a2e]";
  const textClass = variant === "page" ? "text-sm" : "text-[11px] text-[#71717a]";

  const multiBrand = brands.length > 1;
  const watchedBrandIds = new Set(
    brands.filter((b) => brandWatchEnabled(settings.watch_workspaces, b)).map((b) => b.id),
  );
  const visibleCompetitors = multiBrand
    ? competitors.filter((c) => !c.brandId || watchedBrandIds.has(c.brandId))
    : competitors;

  const groups: Array<{ label: string | null; items: CompetitorOption[] }> = multiBrand
    ? brands
        .filter((b) => watchedBrandIds.has(b.id))
        .map((b) => ({
          label: b.name,
          items: visibleCompetitors.filter((c) => c.brandId === b.id),
        }))
        .filter((g) => g.items.length > 0)
    : [{ label: null, items: visibleCompetitors }];

  const renderRow = (c: CompetitorOption) => (
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
  );

  return (
    <div>
      <div className={labelClass}>Watched competitors</div>
      {variant === "modal" ? (
        <p className={`mt-0.5 ${textClass}`}>
          {multiBrand
            ? "Everything in your watched brand sidebars, or pick specific competitors."
            : "All competitors in your sidebar, or pick specific ones."}
        </p>
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
            const watch_competitor_ids = e.target.checked ? null : visibleCompetitors.slice(0, 1).map((c) => c.id);
            void onPatch({ watch_competitor_ids });
          }}
          className="h-3.5 w-3.5 rounded border-[#d4d4d8] accent-emerald-500"
        />
        <span className={variant === "page" ? textClass : "text-[12px] font-medium text-[#3f3f46]"}>All tracked competitors</span>
      </label>
      {!watchAll ? (
        <div
          className={
            variant === "page"
              ? "max-h-40 overflow-y-auto space-y-1 border border-[#E5E7EB] rounded-lg p-2"
              : "mt-2 max-h-40 overflow-y-auto space-y-0.5 rounded-xl border border-white/50 bg-white/35 p-2 backdrop-blur-sm"
          }
        >
          {groups.map((g) => (
            <div key={g.label ?? "all"} className="mt-2 first:mt-0">
              {g.label ? (
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
                  {g.label}
                </div>
              ) : null}
              <div className="space-y-0.5">{g.items.map(renderRow)}</div>
            </div>
          ))}
          {visibleCompetitors.length === 0 ? (
            <p className={`${textClass} py-1`}>No competitors in watched brands yet.</p>
          ) : null}
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
              <p className="text-[11px] font-medium text-[#71717a]">
                Agency branding is applied from your report settings.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
