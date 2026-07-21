"use client";

import { useCallback } from "react";
import { Eye } from "lucide-react";

import { useWorkspaceContext } from "@/lib/team/use-workspace-context";

function formatGuestExpiry(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PreviewBanner() {
  const { state, loading } = useWorkspaceContext({ previewMode: true });

  const leavePreview = useCallback(async () => {
    const res = await fetch("/api/team/guest/exit", { method: "POST", credentials: "include" });
    const json = (await res.json()) as { ok?: boolean; hasAuthenticatedSession?: boolean };
    if (!res.ok || json.ok === false) {
      window.location.href = "/";
      return;
    }
    window.location.href = json.hasAuthenticatedSession ? "/dashboard/spy" : "/login";
  }, []);

  if (loading || !state?.isGuest) return null;

  const label = state.owner?.displayLabel ?? "shared workspace";
  const expiryLabel = formatGuestExpiry(state.guestExpiresAt);

  return (
    <div className="border-b border-amber-200/80 bg-amber-50/95 px-4 py-2.5 text-[13px] text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 font-medium">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          Preview · {label}&apos;s workspace · read-only
          {expiryLabel ? ` · expires ${expiryLabel}` : null}
        </p>
        <button
          type="button"
          onClick={() => void leavePreview()}
          className="rounded-full border border-amber-300/80 bg-white/80 px-3 py-1 text-[12px] font-semibold text-amber-950 hover:bg-white"
        >
          Leave preview
        </button>
      </div>
    </div>
  );
}
