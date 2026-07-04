"use client";

import { useCallback, useEffect, useState } from "react";

import type { AutopilotSettingsRow } from "@/lib/autopilot/types";
import { normalizeWatchMinScoreForUi } from "@/lib/autopilot/watch-alert-score";

export type AutopilotBillingMeta = {
  planTier: string;
  canReports: boolean;
  canBrief: boolean;
  isAgency: boolean;
};

export type AutopilotSettingsUiState = AutopilotSettingsRow & {
  slack_webhook_configured?: boolean;
  user_email?: string | null;
};

export type CompetitorOption = { id: string; name: string };
export type BrandOption = { id: string; name: string };

export function uiMinScore(settings: AutopilotSettingsUiState): 6 | 8 | 9 {
  if (settings.watch_min_score != null) {
    return normalizeWatchMinScoreForUi(settings.watch_min_score);
  }
  if (settings.watch_sensitivity === "big_moves") return 8;
  if (settings.watch_sensitivity === "paranoid") return 6;
  return 6;
}

type SettingsGetResponse = {
  ok?: boolean;
  error?: string;
  settings?: AutopilotSettingsUiState;
  billing?: AutopilotBillingMeta;
};

export function useAutopilotSettings() {
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [settings, setSettings] = useState<AutopilotSettingsUiState | null>(null);
  const [billing, setBilling] = useState<AutopilotBillingMeta | null>(null);

  const loadSettings = useCallback(async () => {
    setError(null);
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/autopilot/settings", { credentials: "include" });
      const data = (await res.json()) as SettingsGetResponse;
      if (!res.ok || !data.ok || !data.settings) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to load autopilot settings");
      }
      setSettings(data.settings);
      setBilling(data.billing ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      setSavedFlash(false);
      try {
        const res = await fetch("/api/autopilot/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patch),
        });
        const data = (await res.json()) as SettingsGetResponse;
        if (!res.ok || !data.ok || !data.settings) {
          const errMsg =
            typeof data.error === "string"
              ? data.error
              : typeof data.error === "object"
                ? "Save failed"
                : "Save failed";
          throw new Error(errMsg);
        }
        setSettings((prev) => ({
          ...data.settings!,
          user_email: prev?.user_email ?? data.settings!.user_email,
        }));
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!settings) return;
      setSettings({ ...settings, enabled });
      await saveSettings({ enabled });
    },
    [settings, saveSettings],
  );

  return {
    settingsLoading,
    saving,
    error,
    savedFlash,
    settings,
    billing,
    setSettings,
    loadSettings,
    saveSettings,
    setEnabled,
  };
}

export type AutopilotSettingsController = ReturnType<typeof useAutopilotSettings>;
