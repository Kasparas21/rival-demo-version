"use client";

import type { WatchSensitivity } from "@/lib/autopilot/types";

const OPTIONS: { id: WatchSensitivity; title: string; description: string }[] = [
  {
    id: "paranoid",
    title: "Paranoid",
    description: "everything — all alert types",
  },
  {
    id: "balanced",
    title: "Balanced",
    description: "meaningful moves — spikes, platform changes, creative pushes",
  },
  {
    id: "big_moves",
    title: "Big moves only",
    description: "rare, important — new platforms, exits, major spikes",
  },
];

export function WatchSensitivityCards(props: {
  value: WatchSensitivity;
  onChange: (v: WatchSensitivity) => void;
  disabled?: boolean;
}) {
  const { value, onChange, disabled } = props;
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              selected
                ? "border-[#111827] bg-[#F9FAFB]"
                : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
            } ${disabled ? "opacity-50" : ""}`}
          >
            <div className="text-sm font-medium text-[#111827]">{opt.title}</div>
            <div className="mt-1 text-xs text-[#6B7280] leading-snug">{opt.description}</div>
          </button>
        );
      })}
    </div>
  );
}
