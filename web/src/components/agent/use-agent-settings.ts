"use client";

import { useCallback, useEffect, useState } from "react";

import { readApiJson } from "@/lib/agent/api-errors";

import type { AgentMessageRow, AgentSettingsState } from "./agent-settings-types";

export function useAgentSettings(opts?: { loadMessages?: boolean }) {
  const loadMessages = opts?.loadMessages ?? false;
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(loadMessages);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [settings, setSettings] = useState<AgentSettingsState | null>(null);
  const [messages, setMessages] = useState<AgentMessageRow[]>([]);

  const loadSettings = useCallback(async () => {
    setError(null);
    setSettingsLoading(true);
    try {
      const settingsRes = await fetch("/api/agent/settings");
      const settingsData = await readApiJson<{
        ok?: boolean;
        error?: string;
        settings?: AgentSettingsState;
      }>(settingsRes);

      if (!settingsRes.ok || !settingsData.ok || !settingsData.settings) {
        throw new Error(settingsData.error ?? "Failed to load agent settings");
      }

      setSettings(settingsData.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadMessagesList = useCallback(async () => {
    if (!loadMessages) return;
    setMessagesLoading(true);
    try {
      const messagesRes = await fetch("/api/agent/messages?page=1");
      const messagesData = await readApiJson<{ ok?: boolean; messages?: AgentMessageRow[] }>(messagesRes);
      setMessages(messagesData.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [loadMessages]);

  const load = useCallback(async () => {
    await Promise.all([loadSettings(), loadMessagesList()]);
  }, [loadSettings, loadMessagesList]);

  useEffect(() => {
    void loadSettings();
    if (loadMessages) void loadMessagesList();
  }, [loadSettings, loadMessagesList, loadMessages]);

  const saveSettings = useCallback(
    async (patch: Partial<AgentSettingsState>) => {
      if (!settings) return false;
      setSaving(true);
      setError(null);
      setSavedFlash(false);
      try {
        const res = await fetch("/api/agent/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await readApiJson<{
          ok?: boolean;
          error?: string;
          settings?: AgentSettingsState;
        }>(res);
        if (!res.ok || !data.ok || !data.settings) {
          throw new Error(data.error ?? "Save failed");
        }
        setSettings(data.settings);
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
    [settings],
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
    messagesLoading,
    /** @deprecated use settingsLoading */
    loading: settingsLoading,
    saving,
    error,
    savedFlash,
    settings,
    messages,
    setSettings,
    load,
    loadSettings,
    loadMessagesList,
    saveSettings,
    setEnabled,
  };
}

export type AgentSettingsController = ReturnType<typeof useAgentSettings>;
