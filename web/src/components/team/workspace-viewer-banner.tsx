"use client";

import { Eye } from "lucide-react";

import { useWorkspaceContext } from "@/lib/team/use-workspace-context";

export function WorkspaceViewerBanner() {
  const { state, loading, switchWorkspace } = useWorkspaceContext();

  if (loading || !state?.isViewer) return null;

  const label = state.owner?.displayLabel ?? "shared workspace";

  return (
    <div className="border-b border-amber-200/80 bg-amber-50/95 px-4 py-2.5 text-[13px] text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 font-medium">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          Viewing {label}&apos;s workspace — read-only. Scraping and settings are disabled.
        </p>
        <button
          type="button"
          onClick={() => void switchWorkspace(null)}
          className="rounded-full border border-amber-300/80 bg-white/80 px-3 py-1 text-[12px] font-semibold text-amber-950 hover:bg-white"
        >
          Switch to my workspace
        </button>
      </div>
    </div>
  );
}

export function WorkspaceSwitcher() {
  const { state, loading, switchWorkspace } = useWorkspaceContext();

  if (loading || !state || state.sharedWorkspaces.length === 0) return null;

  const value = state.isViewer ? state.dataUserId : "";

  return (
    <label className="inline-flex items-center gap-2 text-[12px] text-slate-600">
      <span className="sr-only">Workspace</span>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value || null;
          void switchWorkspace(next);
        }}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] font-medium text-slate-800"
      >
        <option value="">My workspace</option>
        {state.sharedWorkspaces.map((w) => (
          <option key={w.ownerUserId} value={w.ownerUserId}>
            {w.displayLabel}&apos;s workspace
          </option>
        ))}
      </select>
    </label>
  );
}
