"use client";

import { AgentSettingsForm } from "@/components/agent/AgentSettingsForm";
import { AgentMessagesSkeleton, AgentSettingsFormSkeleton } from "@/components/agent/AgentSettingsSkeleton";
import { useAgentSettings } from "@/components/agent/use-agent-settings";

export function AgentSettingsPanel() {
  const { settingsLoading, messagesLoading, saving, error, savedFlash, settings, messages, setSettings, saveSettings, setEnabled } =
    useAgentSettings({ loadMessages: true });

  if (settingsLoading && !settings) {
    return (
      <section className="rounded-2xl border border-[#ececef] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <AgentSettingsFormSkeleton />
      </section>
    );
  }

  if (!settings) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-[13px] text-red-700">{error ?? "Could not load agent settings."}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#ececef] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-[#1a1a2e]">Rival Agent</h2>
        <p className="text-[12px] text-[#71717a]">
          Autonomous competitive intelligence — delivered to Slack, Discord, or email when high-signal moves are
          detected. You can also enable and customize the agent from the sidebar.
        </p>
      </div>

      <AgentSettingsForm
        settings={settings}
        saving={saving}
        savedFlash={savedFlash}
        error={error}
        onChange={setSettings}
        onSave={() =>
          void saveSettings({
            channels: settings.channels,
            min_threat_score: settings.min_threat_score,
            weekly_brief_enabled: settings.weekly_brief_enabled,
          })
        }
        showEnableToggle
        onEnableChange={(enabled) => void setEnabled(enabled)}
      />

      <div className="mt-8 border-t border-[#f0f0f2] pt-6">
        <h3 className="text-[13px] font-semibold text-[#1a1a2e]">Message history</h3>
        {messagesLoading ? (
          <AgentMessagesSkeleton className="mt-3 border-0 pt-0" />
        ) : messages.length === 0 ? (
          <p className="mt-2 text-[12px] text-[#71717a]">No agent messages yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#ececef] text-[#71717a]">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Competitor</th>
                  <th className="py-2 pr-3 font-medium">Subject</th>
                  <th className="py-2 pr-3 font-medium">Channels</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id} className="border-b border-[#f4f4f5] text-[#3f3f46]">
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      {new Date(m.sent_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 pr-3">{m.competitor_name}</td>
                    <td className="py-2.5 pr-3 max-w-[200px] truncate">{m.subject ?? "—"}</td>
                    <td className="py-2.5 pr-3">{(m.channels ?? []).join(", ") || "—"}</td>
                    <td className="py-2.5 capitalize">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
