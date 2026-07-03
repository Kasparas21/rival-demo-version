"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { readApiJson } from "@/lib/agent/api-errors";
import { cn } from "@/lib/utils";

import { AGENT_THRESHOLD_OPTIONS, type AgentSettingsState } from "./agent-settings-types";

type AgentSettingsFormProps = {
  settings: AgentSettingsState;
  saving: boolean;
  savedFlash: boolean;
  error: string | null;
  onChange: (next: AgentSettingsState) => void;
  onSave: () => void;
  showEnableToggle?: boolean;
  onEnableChange?: (enabled: boolean) => void;
};

export function AgentSettingsForm({
  settings,
  saving,
  savedFlash,
  error,
  onChange,
  onSave,
  showEnableToggle = false,
  onEnableChange,
}: AgentSettingsFormProps) {
  const [testingChannel, setTestingChannel] = useState<"slack" | "discord" | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const updateChannel = (key: "slack" | "discord" | "email", patch: { enabled?: boolean; webhook_url?: string }) => {
    onChange({
      ...settings,
      channels: {
        ...settings.channels,
        [key]: { ...settings.channels[key], ...patch },
      },
    });
  };

  const testWebhook = async (channel: "slack" | "discord") => {
    const webhookUrl = settings.channels[channel]?.webhook_url?.trim() ?? "";
    if (!webhookUrl) {
      setTestMessage("Enter a webhook URL first.");
      return;
    }

    setTestingChannel(channel);
    setTestMessage(null);
    try {
      const res = await fetch("/api/agent/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, webhook_url: webhookUrl }),
      });
      const data = await readApiJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Test failed");
      setTestMessage(`${channel === "slack" ? "Slack" : "Discord"} test message sent.`);
    } catch (err) {
      setTestMessage(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTestingChannel(null);
    }
  };

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>
      ) : null}

      {showEnableToggle ? (
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onEnableChange?.(e.target.checked)}
            className="h-4 w-4 rounded border-[#d4d4d8]"
          />
          <span className="text-[14px] font-medium text-[#1a1a2e]">Agent enabled</span>
        </label>
      ) : null}

      <div>
        <h3 className="text-[13px] font-semibold text-[#1a1a2e]">Delivery channels</h3>
        <p className="mt-1 text-[12px] text-[#71717a]">
          Where high-signal intel is sent — separate from the weekly digest.
        </p>

        <div className="mt-3 space-y-3">
          {(["slack", "discord"] as const).map((channel) => (
            <div key={channel} className="rounded-xl border border-[#ececef] p-3">
              <label className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.channels[channel]?.enabled ?? false}
                  onChange={(e) => updateChannel(channel, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-[#d4d4d8]"
                />
                <span className="text-[13px] font-medium capitalize text-[#1a1a2e]">{channel}</span>
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  placeholder={`${channel === "slack" ? "Slack" : "Discord"} webhook URL`}
                  value={settings.channels[channel]?.webhook_url ?? ""}
                  onChange={(e) => updateChannel(channel, { webhook_url: e.target.value })}
                  className="flex-1 rounded-xl border border-[#e4e4e7] px-3 py-2 text-[13px] outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20"
                />
                <button
                  type="button"
                  disabled={testingChannel === channel || saving}
                  onClick={() => void testWebhook(channel)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e4e4e7] px-3 py-2 text-[12px] font-semibold text-[#3f3f46] hover:bg-[#fafafa] disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", testingChannel === channel && "animate-spin")} />
                  Test
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-[#ececef] p-3">
            <label className="mb-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.channels.email?.enabled ?? false}
                onChange={(e) => updateChannel("email", { enabled: e.target.checked })}
                className="h-4 w-4 rounded border-[#d4d4d8]"
              />
              <span className="text-[13px] font-medium text-[#1a1a2e]">Email</span>
            </label>
            <p className="text-[12px] text-[#71717a]">Sends to: {settings.user_email ?? "your account email"}</p>
          </div>
        </div>

        {testMessage ? <p className="mt-2 text-[12px] text-emerald-700">{testMessage}</p> : null}
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-[#1a1a2e]">Alert threshold</h3>
        <div className="mt-2 space-y-2">
          {AGENT_THRESHOLD_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="min_threat_score"
                checked={settings.min_threat_score === opt.value}
                onChange={() => onChange({ ...settings, min_threat_score: opt.value })}
                className="h-4 w-4 border-[#d4d4d8]"
              />
              <span className="text-[13px] text-[#3f3f46]">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={settings.weekly_brief_enabled}
          onChange={(e) => onChange({ ...settings, weekly_brief_enabled: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-[#d4d4d8]"
        />
        <div>
          <span className="text-[13px] font-medium text-[#1a1a2e]">Weekly brief (Mondays)</span>
          <p className="mt-0.5 text-[12px] text-[#71717a]">Opt-in email summary of the week&apos;s signals.</p>
        </div>
      </label>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {savedFlash ? <span className="text-[12px] font-medium text-emerald-600">Saved</span> : null}
      </div>
    </div>
  );
}
