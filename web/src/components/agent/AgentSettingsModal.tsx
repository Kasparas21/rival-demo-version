"use client";

import { Bot, Sparkles, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { glassModalShellClass } from "@/components/ui/glass-styles";

import { AgentSettingsForm } from "./AgentSettingsForm";
import { AgentSettingsFormSkeleton } from "./AgentSettingsSkeleton";
import type { AutopilotSettingsController } from "@/components/autopilot/use-autopilot-settings";
import type { BrandOption, CompetitorOption } from "@/components/autopilot/use-autopilot-settings";

type AgentSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  controller: AutopilotSettingsController;
};

export function AgentSettingsModal({ open, onClose, controller }: AgentSettingsModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [competitors, setCompetitors] = useState<CompetitorOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const {
    settingsLoading,
    saving,
    error,
    savedFlash,
    settings,
    billing,
    setSettings,
    saveSettings,
    loadSettings,
  } = controller;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [brandsRes, compsRes] = await Promise.all([
          fetch("/api/account/brands", { credentials: "include" }),
          fetch("/api/account/saved-competitors", { credentials: "include" }),
        ]);
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
      } catch {
        setCompetitors([]);
        setBrands([]);
      }
    })();
  }, [open]);

  if (!mounted || !open) return null;

  const handleSave = () => {
    if (!settings) return;
    void saveSettings({
      watch_channels: settings.watch_channels,
      watch_min_score: settings.watch_min_score,
      watch_sensitivity: settings.watch_sensitivity,
      watch_competitor_ids: settings.watch_competitor_ids,
      watch_quiet_hours: settings.watch_quiet_hours,
      report_enabled: settings.report_enabled,
      report_day_of_month: settings.report_day_of_month,
      report_workspaces: settings.report_workspaces,
    });
  };

  const showFormSkeleton = settingsLoading && !settings;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/50 via-indigo-950/30 to-emerald-950/20 backdrop-blur-md motion-reduce:backdrop-blur-none"
        aria-label="Close"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[min(92vh,680px)] w-full max-w-[440px] flex-col overflow-hidden ${glassModalShellClass} shadow-[0_32px_80px_-20px_rgba(15,23,42,0.35)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300 sm:max-w-lg`}
      >
        {/* Ambient gradient */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-indigo-400/15 blur-3xl" aria-hidden />

        <div className="relative flex items-start justify-between gap-3 border-b border-white/50 bg-white/30 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-indigo-900 text-white shadow-[0_8px_24px_-8px_rgba(26,26,46,0.6)] ring-1 ring-white/20">
              <Bot className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 id={titleId} className="text-[17px] font-semibold tracking-tight text-[#1a1a2e]">
                  Autopilot
                </h2>
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
              </div>
              <p className="mt-0.5 text-[12px] leading-snug text-[#71717a]">
                Channels, thresholds & delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/60 bg-white/50 p-2 text-[#71717a] shadow-sm backdrop-blur-sm transition hover:bg-white/80 hover:text-[#1a1a2e]"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {showFormSkeleton ? (
            <AgentSettingsFormSkeleton />
          ) : !settings ? (
            <p className="text-[13px] text-red-700">{error ?? "Could not load settings."}</p>
          ) : (
            <AgentSettingsForm
              settings={settings!}
              billing={billing}
              competitors={competitors}
              brands={brands}
              saving={saving}
              savedFlash={savedFlash}
              error={error}
              onSettingsChange={setSettings}
              onPatch={async (body) => {
                await saveSettings(body);
              }}
              onSave={handleSave}
              onRefresh={loadSettings}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
