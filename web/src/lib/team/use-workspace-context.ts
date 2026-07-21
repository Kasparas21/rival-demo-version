"use client";

import { useCallback, useEffect, useState } from "react";

import { clearSidebarCompetitorsForWorkspaceSwitch } from "@/lib/sidebar-competitors";

export type WorkspaceContextState = {
  sessionUserId: string;
  dataUserId: string;
  role: "owner" | "viewer";
  isViewer: boolean;
  owner: {
    ownerUserId: string;
    ownerEmail: string | null;
    ownerName: string | null;
    displayLabel: string;
  } | null;
  sharedWorkspaces: Array<{
    ownerUserId: string;
    ownerEmail: string | null;
    ownerName: string | null;
    displayLabel: string;
  }>;
};

type ApiResponse = WorkspaceContextState & { ok?: boolean; error?: string };

export function useWorkspaceContext() {
  const [state, setState] = useState<WorkspaceContextState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/context", { credentials: "include" });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Failed to load workspace context");
      }
      setState({
        sessionUserId: json.sessionUserId,
        dataUserId: json.dataUserId,
        role: json.role,
        isViewer: json.isViewer,
        owner: json.owner ?? null,
        sharedWorkspaces: json.sharedWorkspaces ?? [],
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace context");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchWorkspace = useCallback(
    async (ownerUserId: string | null) => {
      const res = await fetch("/api/team/switch-workspace", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerUserId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Could not switch workspace");
      }
      clearSidebarCompetitorsForWorkspaceSwitch();
      await refresh();
      window.location.reload();
    },
    [refresh],
  );

  return { state, loading, error, refresh, switchWorkspace };
}
