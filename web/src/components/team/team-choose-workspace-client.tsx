"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Home, Loader2 } from "lucide-react";

import { RivalLogoImg } from "@/components/rival-logo";
import type { WorkspaceContextState } from "@/lib/team/use-workspace-context";

export function TeamChooseWorkspaceClient() {
  const router = useRouter();
  const [state, setState] = useState<WorkspaceContextState | null>(null);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/context", { credentials: "include" });
      const json = (await res.json()) as WorkspaceContextState & { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Could not load workspaces");
      }
      setState({
        sessionUserId: json.sessionUserId,
        dataUserId: json.dataUserId,
        role: json.role,
        isViewer: json.isViewer,
        owner: json.owner ?? null,
        sharedWorkspaces: json.sharedWorkspaces ?? [],
      });
      if ((json.sharedWorkspaces ?? []).length === 0) {
        router.replace("/dashboard/spy");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspaces");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const choose = async (ownerUserId: string | null) => {
    setChoosing(ownerUserId ?? "mine");
    setError(null);
    try {
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
      window.location.href = "/dashboard/spy";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch workspace");
      setChoosing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <p className="text-[15px]">Loading workspaces…</p>
      </div>
    );
  }

  if (error && !state?.sharedWorkspaces.length) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-[15px] font-medium text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <RivalLogoImg className="mx-auto mb-8 h-7 w-auto max-w-[160px] object-contain" />
      <h1 className="text-center text-[26px] font-bold tracking-tight text-slate-900">Choose a workspace</h1>
      <p className="mt-2 text-center text-[15px] text-slate-600">
        You can switch anytime from the dashboard sidebar.
      </p>

      {error ? <p className="mt-4 text-center text-[13px] font-medium text-red-700">{error}</p> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={choosing != null}
          onClick={() => void choose(null)}
          className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md disabled:opacity-60"
        >
          <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-2.5 text-slate-700">
            <Home className="h-5 w-5" />
          </div>
          <p className="text-[16px] font-semibold text-slate-900">My workspace</p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            Your own Rival account — add competitors and scrape when you&apos;re ready.
          </p>
          {choosing === "mine" ? (
            <p className="mt-3 text-[12px] font-medium text-slate-500">Opening…</p>
          ) : null}
        </button>

        {state?.sharedWorkspaces.map((w) => (
          <button
            key={w.ownerUserId}
            type="button"
            disabled={choosing != null}
            onClick={() => void choose(w.ownerUserId)}
            className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-6 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md disabled:opacity-60"
          >
            <div className="mb-3 inline-flex rounded-xl bg-amber-100 p-2.5 text-amber-900">
              <Eye className="h-5 w-5" />
            </div>
            <p className="text-[16px] font-semibold text-slate-900">{w.displayLabel}&apos;s workspace</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Read-only — browse their competitors, ads, and shared AI insights.
            </p>
            {choosing === w.ownerUserId ? (
              <p className="mt-3 text-[12px] font-medium text-amber-800">Opening…</p>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
