"use client";

import { ArrowRight, Bot, Sparkles } from "lucide-react";

import { AgentSettingsModal } from "@/components/agent/AgentSettingsModal";
import { AutopilotDeliveryStatusBanner } from "@/components/autopilot/AutopilotDeliveryStatusBanner";
import { autopilotGlassCardClass, GlassToggle } from "@/components/autopilot/autopilot-glass-ui";
import { useAutopilotModalQuery } from "@/components/autopilot/use-autopilot-modal-query";
import { useAutopilotOAuthToast } from "@/components/autopilot/use-autopilot-oauth-toast";
import { useAutopilotSettings } from "@/components/autopilot/use-autopilot-settings";
import { SettingsGlassSection } from "@/components/settings/settings-glass-ui";
import { cn } from "@/lib/utils";

export function SettingsAutopilotSection() {
  const controller = useAutopilotSettings();
  const { settingsLoading, settings, setEnabled, error, loadSettings, deliveryStatus } = controller;
  const {
    settingsOpen,
    historyOpen,
    openSettings,
    closeSettings,
    setHistoryOpen,
  } = useAutopilotModalQuery("settings");

  useAutopilotOAuthToast(() => {
    void loadSettings();
  });

  return (
    <>
      <SettingsGlassSection
        icon={Bot}
        accent="emerald"
        title={
          <span className="inline-flex items-center gap-1.5">
            Autopilot
            <Sparkles className="h-4 w-4 text-emerald-500" aria-hidden />
          </span>
        }
        subtitle={
          <>
            Alerts with suggested moves and monthly client-ready reports — delivered without you checking in.
            {error && !settings ? (
              <span className="mt-2 block text-[12px] font-medium text-red-600">{error}</span>
            ) : null}
          </>
        }
        headerRight={
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-[#71717a]">
              {settingsLoading ? "…" : settings?.enabled ? "On" : "Off"}
            </span>
            <GlassToggle
              enabled={settings?.enabled ?? false}
              disabled={settingsLoading || !settings}
              onChange={(next) => void setEnabled(next)}
            />
          </div>
        }
        ringClassName={settings?.enabled ? "ring-emerald-200/40" : undefined}
      >
        <AutopilotDeliveryStatusBanner status={deliveryStatus} loading={settingsLoading} />
        <button
          type="button"
          onClick={openSettings}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left transition hover:bg-white/70 active:scale-[0.99]",
            autopilotGlassCardClass,
          )}
        >
          <span>
            <span className="block text-[14px] font-semibold text-[#1a1a2e]">Channels, thresholds & delivery</span>
            <span className="mt-0.5 block text-[12px] text-[#71717a]">
              Email, Slack, alert sensitivity, quiet hours, reports
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#4f46e5]">
            Customize
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </button>
      </SettingsGlassSection>

      <AgentSettingsModal
        open={settingsOpen}
        onClose={closeSettings}
        controller={controller}
        historyOpen={historyOpen}
        onHistoryOpenChange={setHistoryOpen}
      />
    </>
  );
}
