"use client";

import { Bot, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { AgentSettingsForm } from "./AgentSettingsForm";
import { AgentMessagesSkeleton, AgentSettingsFormSkeleton } from "./AgentSettingsSkeleton";
import type { AgentMessageRow } from "./agent-settings-types";
import type { AgentSettingsController } from "./use-agent-settings";

type AgentSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  controller: AgentSettingsController;
};

export function AgentSettingsModal({ open, onClose, controller }: AgentSettingsModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const {
    settingsLoading,
    messagesLoading,
    saving,
    error,
    savedFlash,
    settings,
    messages,
    setSettings,
    saveSettings,
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

  if (!mounted || !open) return null;

  const handleSave = () => {
    if (!settings) return;
    void saveSettings({
      channels: settings.channels,
      min_threat_score: settings.min_threat_score,
      weekly_brief_enabled: settings.weekly_brief_enabled,
    });
  };

  const showForm = Boolean(settings);
  const showFormSkeleton = settingsLoading && !settings;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1a2e]/40 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#ececef] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#f0f0f2] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1a1a2e] text-white">
              <Bot className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id={titleId} className="text-[16px] font-semibold text-[#1a1a2e]">
                Rival autopilot
              </h2>
              <p className="mt-0.5 text-[12px] text-[#71717a]">Channels, alert threshold, and weekly brief.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#1a1a2e]"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {showFormSkeleton ? (
            <AgentSettingsFormSkeleton />
          ) : !showForm ? (
            <p className="text-[13px] text-red-700">{error ?? "Could not load settings."}</p>
          ) : (
            <>
              <AgentSettingsForm
                settings={settings}
                saving={saving}
                savedFlash={savedFlash}
                error={error}
                onChange={setSettings}
                onSave={handleSave}
              />
              {messagesLoading ? (
                <AgentMessagesSkeleton />
              ) : (
                <MessageHistoryCompact messages={messages} />
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MessageHistoryCompact({ messages }: { messages: AgentMessageRow[] }) {
  if (messages.length === 0) return null;

  return (
    <div className="mt-6 border-t border-[#f0f0f2] pt-5">
      <h3 className="text-[13px] font-semibold text-[#1a1a2e]">Recent messages</h3>
      <ul className="mt-2 space-y-2">
        {messages.slice(0, 5).map((m) => (
          <li key={m.id} className="rounded-lg bg-[#fafafa] px-3 py-2 text-[12px] text-[#52525b]">
            <span className="font-medium text-[#1a1a2e]">{m.competitor_name}</span>
            {" · "}
            {m.subject ?? "Intel alert"}
            <span className="mt-0.5 block text-[11px] text-[#a1a1aa]">
              {new Date(m.sent_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
