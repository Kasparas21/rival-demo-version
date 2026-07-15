"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

import { AutopilotDeliveryStatusBanner } from "@/components/autopilot/AutopilotDeliveryStatusBanner";
import {
  autopilotGlassCardClass,
  autopilotGlassCardActiveClass,
  GlassSection,
  GlassToggle,
} from "@/components/autopilot/autopilot-glass-ui";
import { AutopilotAutoReportSection, AutopilotClientBrandsSection, AutopilotCompetitorsSection, AutopilotQuietHoursSection } from "@/components/autopilot/AutopilotWatchSections";
import { AutopilotChannelsSection } from "@/components/autopilot/AutopilotChannelsSection";
import { AutopilotThresholdSlider } from "@/components/autopilot/AutopilotThresholdRadios";
import type { AutopilotBillingMeta, AutopilotSettingsUiState, BrandOption, CompetitorOption } from "@/components/autopilot/use-autopilot-settings";
import { uiMinScore } from "@/components/autopilot/use-autopilot-settings";
import type { AutopilotDeliveryStatus } from "@/lib/autopilot/autopilot-delivery-status";
import { cn } from "@/lib/utils";

const SAVE_FOOTER_HEIGHT_CLASS = "h-14";

type AutopilotStickySaveFooterProps = {
  scrollRootRef?: RefObject<HTMLDivElement | null>;
  saving: boolean;
  hasUnsavedChanges: boolean;
  savedFlash: boolean;
  onSave: () => void;
};

function AutopilotStickySaveFooter({
  scrollRootRef,
  saving,
  hasUnsavedChanges,
  savedFlash,
  onSave,
}: AutopilotStickySaveFooterProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    const root = scrollRootRef?.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setDocked(entry.isIntersecting),
      { root, threshold: 0, rootMargin: "0px 0px -1px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollRootRef]);

  return (
    <>
      <div ref={sentinelRef} className="pointer-events-none h-px w-full shrink-0" aria-hidden />
      <div className={SAVE_FOOTER_HEIGHT_CLASS} aria-hidden />
      <div
        className={cn(
          "sticky bottom-0 z-10 -mt-14",
          SAVE_FOOTER_HEIGHT_CLASS,
          "motion-safe:transition-[box-shadow,background-color,backdrop-filter] motion-safe:duration-300 motion-safe:ease-out",
          docked
            ? "bg-transparent shadow-none backdrop-blur-none"
            : "bg-gradient-to-t from-white/98 via-white/88 to-white/0 shadow-[0_-12px_32px_-16px_rgba(15,23,42,0.2)] backdrop-blur-xl",
        )}
      >
        <div className="flex h-full items-center gap-3">
          <button
            type="button"
            disabled={saving || !hasUnsavedChanges}
            onClick={onSave}
            className="flex-1 rounded-2xl bg-gradient-to-b from-[#1a1a2e] to-[#2d2d44] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(26,26,46,0.5)] transition hover:shadow-[0_12px_28px_-8px_rgba(26,26,46,0.55)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {savedFlash ? (
            <span className="text-[12px] font-medium text-emerald-600 motion-safe:animate-in motion-safe:fade-in">
              Saved
            </span>
          ) : hasUnsavedChanges ? (
            <span className="text-[12px] font-medium text-amber-600">Unsaved changes</span>
          ) : null}
        </div>
      </div>
    </>
  );
}

type AgentSettingsFormProps = {
  settings: AutopilotSettingsUiState;
  billing: AutopilotBillingMeta | null;
  competitors: CompetitorOption[];
  brands: BrandOption[];
  saving: boolean;
  savedFlash: boolean;
  hasUnsavedChanges?: boolean;
  error: string | null;
  onSettingsChange: (next: AutopilotSettingsUiState) => void;
  /** Immediate server write (e.g. Slack webhook before test). */
  onPersistPartial?: (patch: Record<string, unknown>) => Promise<boolean>;
  onSave: () => void;
  onRefresh?: () => void | Promise<void>;
  onViewHistory?: () => void;
  deliveryStatus?: AutopilotDeliveryStatus | null;
  scrollRootRef?: RefObject<HTMLDivElement | null>;
};

export function AgentSettingsForm({
  settings,
  billing,
  competitors,
  brands,
  saving,
  savedFlash,
  hasUnsavedChanges = false,
  error,
  onSettingsChange,
  onPersistPartial,
  onSave,
  onRefresh,
  onViewHistory,
  deliveryStatus,
  scrollRootRef,
}: AgentSettingsFormProps) {
  const [slackInput, setSlackInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setSlackInput("");
  }, [settings.id]);

  const applyPatch = (partial: Partial<AutopilotSettingsUiState>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const applyRecordPatch = (body: Record<string, unknown>) => {
    onSettingsChange({ ...settings, ...body } as AutopilotSettingsUiState);
  };

  const thresholdDisabled = saving || !settings.enabled || !settings.watch_enabled;

  return (
    <div className="space-y-4 pb-1">
      {(error || localError) ? (
        <div className="rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-[12px] text-red-700 backdrop-blur-sm">
          {error ?? localError}
        </div>
      ) : null}

      <AutopilotDeliveryStatusBanner status={deliveryStatus ?? null} />

      <div
        className={cn(
          autopilotGlassCardClass,
          "flex items-center justify-between gap-3 p-3.5",
          settings.enabled && autopilotGlassCardActiveClass,
        )}
      >
        <div>
          <p className="text-[14px] font-semibold text-[#1a1a2e]">Autopilot</p>
          <p className="text-[11px] text-[#71717a]">
            {settings.enabled ? "Watching competitors & delivering alerts" : "Paused — no alerts sent"}
          </p>
        </div>
        <GlassToggle enabled={settings.enabled} disabled={saving} onChange={(v) => applyPatch({ enabled: v })} />
      </div>

      <AutopilotChannelsSection
        settings={settings}
        saving={saving}
        variant="modal"
        slackInput={slackInput}
        onSlackInputChange={setSlackInput}
        onPatch={applyRecordPatch}
        onPersistPartial={onPersistPartial}
        onError={setLocalError}
        onRefresh={onRefresh}
      />

      <GlassSection title="Alert threshold" subtitle="Slide right for more alerts, left for fewer.">
        <AutopilotThresholdSlider
          variant="modal"
          value={uiMinScore(settings)}
          disabled={thresholdDisabled}
          onChange={(_minScore, patch) => {
            applyPatch({
              watch_min_score: patch.watch_min_score,
              watch_sensitivity: patch.watch_sensitivity as AutopilotSettingsUiState["watch_sensitivity"],
            });
          }}
        />
      </GlassSection>

      <div className={cn(autopilotGlassCardClass, "space-y-3 p-3.5")}>
        <AutopilotClientBrandsSection
          settings={settings}
          brands={brands}
          competitors={competitors}
          saving={saving}
          onPatch={applyRecordPatch}
        />
        {brands.length <= 1 ? (
          <AutopilotCompetitorsSection
            settings={settings}
            competitors={competitors}
            brands={brands}
            saving={saving}
            variant="modal"
            onPatch={(body) => {
              if (body.watch_competitor_ids !== undefined) {
                applyPatch({ watch_competitor_ids: body.watch_competitor_ids as string[] | null });
              }
            }}
          />
        ) : null}
        <div className="border-t border-white/50 pt-3">
          <AutopilotQuietHoursSection
            settings={settings}
            saving={saving}
            variant="modal"
            onPatch={(body) => {
              if (body.watch_quiet_hours) {
                applyPatch({
                  watch_quiet_hours: body.watch_quiet_hours as AutopilotSettingsUiState["watch_quiet_hours"],
                });
              }
            }}
          />
        </div>
      </div>

      <AutopilotAutoReportSection
        settings={settings}
        billing={billing}
        brands={brands}
        saving={saving}
        variant="modal"
        onPatch={(body) => {
          applyRecordPatch(body);
        }}
      />

      <AutopilotStickySaveFooter
        scrollRootRef={scrollRootRef}
        saving={saving}
        hasUnsavedChanges={hasUnsavedChanges}
        savedFlash={savedFlash}
        onSave={onSave}
      />

      <button
        type="button"
        onClick={onViewHistory}
        className="group flex w-full items-center justify-between rounded-2xl border border-white/60 bg-white/40 px-3.5 py-3 text-left text-[12px] font-medium text-[#52525b] shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-[#1a1a2e] active:scale-[0.99]"
      >
        View alert history
        <ChevronRight className="h-4 w-4 text-[#a1a1aa] transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
      </button>
    </div>
  );
}
