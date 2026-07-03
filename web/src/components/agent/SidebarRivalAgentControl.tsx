"use client";

import { ArrowRight, Bot } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { AgentSettingsModal } from "./AgentSettingsModal";
import { useAgentSettings } from "./use-agent-settings";

type SidebarRivalAgentControlProps = {
  collapsed?: boolean;
};

function AgentIconButton({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1a1a2e] text-white",
        className,
      )}
    >
      <Bot className={cn("h-[18px] w-[18px] stroke-[1.75]", iconClassName)} aria-hidden />
    </div>
  );
}

function AgentToggleSwitch({
  enabled,
  disabled,
  onChange,
  id,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!enabled);
      }}
      className={cn(
        "relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full p-[2px] transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-50",
        enabled
          ? "bg-gradient-to-b from-emerald-400 to-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
          : "bg-[#e5e7eb] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]",
      )}
      title={enabled ? "Turn Rival autopilot off" : "Turn Rival autopilot on"}
    >
      <span
        className={cn(
          "pointer-events-none block h-[18px] w-[18px] rounded-full bg-white transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          enabled
            ? "translate-x-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)]"
            : "translate-x-0 shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
        )}
      />
    </button>
  );
}

export function SidebarRivalAgentControl({ collapsed = false }: SidebarRivalAgentControlProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const controller = useAgentSettings({ loadMessages: true });
  const { settingsLoading, settings, setEnabled, error } = controller;
  const toggleId = "sidebar-rival-agent-toggle";

  const openModal = () => setModalOpen(true);

  if (collapsed) {
    return (
      <>
        <button
          type="button"
          onClick={openModal}
          className="flex flex-col items-center gap-1.5 py-1 rounded-lg hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/30"
          title="Rival autopilot — tap to customize"
        >
          <AgentIconButton className="h-9 w-9 rounded-xl" iconClassName="h-5 w-5" />
          <AgentToggleSwitch
            id={`${toggleId}-collapsed`}
            enabled={settings?.enabled ?? false}
            disabled={settingsLoading || !settings}
            onChange={(next) => void setEnabled(next)}
          />
        </button>
        <AgentSettingsModal open={modalOpen} onClose={() => setModalOpen(false)} controller={controller} />
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "rounded-xl border px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors",
          settings?.enabled ? "border-emerald-200/70 bg-emerald-50/25" : "border-[#e8e8e8]/90 bg-white/60",
        )}
      >
        <div className="flex items-center gap-2.5">
          <AgentIconButton />

          <button
            type="button"
            onClick={openModal}
            className="group min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/30 rounded -my-0.5 py-0.5"
            title="Open Rival autopilot settings"
          >
            <span className="block text-[12px] font-semibold leading-tight text-[#343434] group-hover:text-[#1a1a2e]">
              Rival autopilot
            </span>
            <span className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium text-[#71717a] group-hover:text-[#52525b]">
              <span className="group-hover:underline underline-offset-2">Customize</span>
              <ArrowRight
                className="h-3 w-3 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#6366f1]"
                aria-hidden
              />
            </span>
          </button>

          <AgentToggleSwitch
            id={toggleId}
            enabled={settings?.enabled ?? false}
            disabled={settingsLoading || !settings}
            onChange={(next) => void setEnabled(next)}
          />
        </div>

        {error && !settings ? (
          <p className="mt-1 text-[10px] leading-snug text-red-600">{error}</p>
        ) : null}
      </div>

      <AgentSettingsModal open={modalOpen} onClose={() => setModalOpen(false)} controller={controller} />
    </>
  );
}
