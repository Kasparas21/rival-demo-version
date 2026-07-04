"use client";

import { ChevronDown, RefreshCw } from "lucide-react";
import { useState } from "react";

import {
  autopilotGlassCardClass,
  autopilotGlassCardActiveClass,
  autopilotGlassInputClass,
  ChannelBrandIcon,
  GlassSection,
  GlassToggle,
} from "@/components/autopilot/autopilot-glass-ui";
import type { AutopilotSettingsUiState } from "@/components/autopilot/use-autopilot-settings";
import { cn } from "@/lib/utils";

type AutopilotChannelsSectionProps = {
  settings: AutopilotSettingsUiState;
  saving: boolean;
  disabled?: boolean;
  variant?: "modal" | "page";
  slackInput: string;
  onSlackInputChange: (value: string) => void;
  onPatch: (body: Record<string, unknown>) => void | Promise<void>;
  onError?: (message: string) => void;
  onRefresh?: () => void | Promise<void>;
};

function connectUrl(variant: "modal" | "page"): string {
  const returnTo = variant === "modal" ? "modal" : "settings";
  return `/api/integrations/slack/connect?return_to=${returnTo}`;
}

function slackSubtitle(settings: AutopilotSettingsUiState): string {
  if (settings.slack_connection) {
    const { channel, team_name } = settings.slack_connection;
    return `Connected to ${channel} · ${team_name}`;
  }
  if (settings.slack_webhook_configured) {
    return "Webhook connected (manual)";
  }
  return "Connect with one click";
}

export function AutopilotChannelsSection({
  settings,
  saving,
  disabled = false,
  variant = "modal",
  slackInput,
  onSlackInputChange,
  onPatch,
  onError,
  onRefresh,
}: AutopilotChannelsSectionProps) {
  const [testingSlack, setTestingSlack] = useState(false);
  const [disconnectingSlack, setDisconnectingSlack] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const isDisabled = disabled || saving || !settings.enabled;
  const slackConfigured = Boolean(settings.slack_webhook_configured);

  const updateChannel = (key: "email" | "slack", enabled: boolean) => {
    if (key === "slack" && enabled && !slackConfigured) {
      window.location.href = connectUrl(variant);
      return;
    }
    void onPatch({ watch_channels: { ...settings.watch_channels, [key]: enabled } });
  };

  const testSlack = async () => {
    setTestingSlack(true);
    setTestMessage(null);
    try {
      if (slackInput.trim()) await onPatch({ slack_webhook_url: slackInput.trim() });
      const res = await fetch("/api/autopilot/test-slack", { method: "POST", credentials: "include" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Test failed");
      setTestMessage("Slack test sent.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestMessage(msg);
      onError?.(msg);
    } finally {
      setTestingSlack(false);
    }
  };

  const disconnectSlack = async () => {
    if (!window.confirm("Disconnect Slack? Alerts will no longer be sent to this channel.")) return;

    setDisconnectingSlack(true);
    setTestMessage(null);
    try {
      const res = await fetch("/api/integrations/slack/disconnect", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Disconnect failed");
      onSlackInputChange("");
      await onRefresh?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Disconnect failed";
      onError?.(msg);
    } finally {
      setDisconnectingSlack(false);
    }
  };

  if (variant === "page") {
    return (
      <div className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Channels</div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.watch_channels.email}
            disabled={isDisabled}
            onChange={(e) => updateChannel("email", e.target.checked)}
          />
          Email
        </label>

        <div className="rounded-lg border border-[#E5E7EB] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={settings.watch_channels.slack}
                disabled={isDisabled}
                onChange={(e) => updateChannel("slack", e.target.checked)}
              />
              Slack
            </label>
            <span className="text-xs text-[#6B7280]">{slackSubtitle(settings)}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {slackConfigured ? (
              <>
                <button
                  type="button"
                  className="text-sm text-[#2563EB] hover:underline disabled:opacity-50"
                  disabled={testingSlack || saving}
                  onClick={() => void testSlack()}
                >
                  {testingSlack ? "Sending…" : "Send test"}
                </button>
                <button
                  type="button"
                  className="text-sm text-[#6B7280] hover:underline disabled:opacity-50"
                  disabled={disconnectingSlack || saving}
                  onClick={() => void disconnectSlack()}
                >
                  {disconnectingSlack ? "Disconnecting…" : "Disconnect"}
                </button>
              </>
            ) : (
              <a
                href={connectUrl("page")}
                className="inline-flex items-center gap-2 rounded-lg bg-[#4A154B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#3e1140]"
              >
                <ChannelBrandIcon channel="slack" className="h-4 w-4" />
                Connect Slack
              </a>
            )}
            <button
              type="button"
              className="text-sm text-[#6B7280] hover:underline"
              onClick={() => setManualOpen((v) => !v)}
            >
              {manualOpen ? "Hide manual URL" : "Paste webhook URL manually"}
            </button>
          </div>

          {manualOpen ? (
            <input
              type="url"
              className="mt-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
              placeholder="Slack webhook URL"
              value={slackInput}
              disabled={isDisabled}
              onChange={(e) => onSlackInputChange(e.target.value)}
              onBlur={() => {
                const val = slackInput.trim();
                if (val) void onPatch({ slack_webhook_url: val });
              }}
            />
          ) : null}
        </div>

        {testMessage ? (
          <p
            className={cn(
              "text-sm",
              testMessage.toLowerCase().includes("fail") ? "text-red-600" : "text-green-700",
            )}
          >
            {testMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <GlassSection title="Delivery channels" subtitle="Alerts only — separate from the weekly digest.">
      <div className="space-y-2">
        <div
          className={cn(
            autopilotGlassCardClass,
            "flex items-center gap-3 p-3",
            settings.watch_channels.email && autopilotGlassCardActiveClass,
          )}
        >
          <ChannelBrandIcon channel="email" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#1a1a2e]">Email</p>
            <p className="truncate text-[11px] text-[#71717a]">{settings.user_email ?? "Your account email"}</p>
          </div>
          <GlassToggle
            size="sm"
            enabled={settings.watch_channels.email}
            disabled={isDisabled}
            onChange={(v) => updateChannel("email", v)}
          />
        </div>

        <div
          className={cn(
            autopilotGlassCardClass,
            "overflow-hidden",
            settings.watch_channels.slack && autopilotGlassCardActiveClass,
          )}
        >
          <div className="flex items-center gap-3 p-3">
            <ChannelBrandIcon channel="slack" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#1a1a2e]">Slack</p>
              <p className="truncate text-[11px] text-[#71717a]">{slackSubtitle(settings)}</p>
            </div>
            <GlassToggle
              size="sm"
              enabled={settings.watch_channels.slack}
              disabled={isDisabled}
              onChange={(v) => updateChannel("slack", v)}
            />
          </div>

          {settings.watch_channels.slack ? (
            <div className="border-t border-white/50 bg-white/30 px-3 py-2.5 backdrop-blur-sm">
              {slackConfigured ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={testingSlack || saving}
                    onClick={() => void testSlack()}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/70 bg-white/60 px-2.5 py-1.5 text-[11px] font-semibold text-[#3f3f46] shadow-sm backdrop-blur-sm transition hover:bg-white/80 disabled:opacity-45"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", testingSlack && "animate-spin")} />
                    Send test
                  </button>
                  <button
                    type="button"
                    disabled={disconnectingSlack || saving}
                    onClick={() => void disconnectSlack()}
                    className="text-[11px] font-medium text-[#71717a] underline-offset-2 hover:text-[#3f3f46] hover:underline disabled:opacity-45"
                  >
                    {disconnectingSlack ? "Disconnecting…" : "Disconnect"}
                  </button>
                  {!settings.slack_connection ? (
                    <button
                      type="button"
                      className="text-[11px] font-medium text-[#71717a] underline-offset-2 hover:underline"
                      onClick={() => setManualOpen((v) => !v)}
                    >
                      {manualOpen ? "Hide manual URL" : "Replace URL manually"}
                    </button>
                  ) : null}
                </div>
              ) : (
                <a
                  href={connectUrl("modal")}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#4A154B] px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#3e1140]"
                >
                  <ChannelBrandIcon channel="slack" className="h-4 w-4 shrink-0" />
                  Connect Slack
                </a>
              )}

              {!slackConfigured || manualOpen ? (
                <div className={cn(slackConfigured ? "mt-2" : "mt-0")}>
                  {!slackConfigured ? (
                    <button
                      type="button"
                      className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[#71717a] underline-offset-2 hover:underline"
                      onClick={() => setManualOpen((v) => !v)}
                    >
                      <ChevronDown className={cn("h-3.5 w-3.5 transition", manualOpen && "rotate-180")} />
                      Paste webhook URL manually
                    </button>
                  ) : null}
                  {manualOpen ? (
                    <div className={cn("flex gap-2", !slackConfigured ? "mt-2" : "mt-0")}>
                      <input
                        type="url"
                        placeholder={
                          slackConfigured && !slackInput
                            ? "Saved — paste to replace"
                            : "Slack webhook URL"
                        }
                        value={slackInput}
                        disabled={isDisabled}
                        onChange={(e) => onSlackInputChange(e.target.value)}
                        onBlur={() => {
                          const val = slackInput.trim();
                          if (val) void onPatch({ slack_webhook_url: val });
                        }}
                        className={cn(autopilotGlassInputClass, "flex-1 text-[12px]")}
                      />
                      {slackConfigured ? (
                        <button
                          type="button"
                          disabled={testingSlack || saving}
                          onClick={() => void testSlack()}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/70 bg-white/60 px-2.5 py-2 text-[11px] font-semibold text-[#3f3f46] shadow-sm backdrop-blur-sm transition hover:bg-white/80 disabled:opacity-45"
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", testingSlack && "animate-spin")} />
                          Test
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {testMessage ? (
          <p
            className={cn(
              "text-[11px] font-medium",
              testMessage.toLowerCase().includes("fail") ? "text-red-600" : "text-emerald-600",
            )}
          >
            {testMessage}
          </p>
        ) : null}
      </div>
    </GlassSection>
  );
}
