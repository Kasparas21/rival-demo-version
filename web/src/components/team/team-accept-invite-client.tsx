"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Eye, Loader2 } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { glassPanelClass } from "@/components/ui/glass-styles";
import { clearSidebarCompetitorsForWorkspaceSwitch } from "@/lib/sidebar-competitors";

type InvitePreview = {
  ok: boolean;
  status?: string;
  invitedEmail?: string;
  invitedEmailMasked?: string;
  owner?: { displayLabel: string };
  error?: string;
};

export function TeamAcceptInviteClient({ token }: { token: string }) {
  const acceptPath = `/team/accept/${token}`;
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptionalLogin, setShowOptionalLogin] = useState(false);
  const autoEnteredRef = useRef(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/team/invite/${encodeURIComponent(token)}`, { credentials: "include" });
      const json = (await res.json()) as InvitePreview;
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Invite not found");
      }
      setPreview(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load invite");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const enterGuestWorkspace = useCallback(async () => {
    setEntering(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/invite/${encodeURIComponent(token)}/enter`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Could not open workspace");
      }
      clearSidebarCompetitorsForWorkspaceSwitch();
      window.location.href = "/preview/spy";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open workspace";
      setError(message);
      setShowOptionalLogin(true);
      setEntering(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (loading || !preview) return;
    if (autoEnteredRef.current) return;
    autoEnteredRef.current = true;
    void enterGuestWorkspace();
  }, [enterGuestWorkspace, loading, preview]);

  const ownerLabel = preview?.owner?.displayLabel ?? "A teammate";
  const invitedEmail = preview?.invitedEmail?.trim() ?? "";

  if (loading) {
    return (
      <InviteShell>
        <LoadingState message="Loading invite…" />
      </InviteShell>
    );
  }

  if (error && !preview) {
    return (
      <InviteShell>
        <ErrorPanel message={error} />
      </InviteShell>
    );
  }

  if (entering) {
    return (
      <InviteShell>
        <LoadingState message={`Opening ${ownerLabel}'s workspace…`} />
      </InviteShell>
    );
  }

  if (showOptionalLogin) {
    return (
      <InviteShell>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-[12px] font-semibold text-amber-900 shadow-sm backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5" />
          Team invite · read-only access
        </div>
        <div className={`w-full max-w-[440px] ${glassPanelClass} mb-4 text-center`}>
          <p className="text-[15px] font-medium text-[#b42318]">{error ?? "This invite link is no longer valid."}</p>
        </div>
        <details className="w-full max-w-[440px]">
          <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-[14px] font-semibold text-gray-800 [&::-webkit-details-marker]:hidden">
            Sign in to save access to this workspace
            <ChevronDown className="h-4 w-4" />
          </summary>
          <div className="mt-4">
            <LoginForm
              embedded
              nextPath={acceptPath}
              initialEmail={invitedEmail}
              lockEmail={Boolean(invitedEmail)}
              heading="Sign in to accept invite"
              description={`${ownerLabel} invited you. Sign in with ${invitedEmail || "the invited email"} for persistent access.`}
            />
          </div>
        </details>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <LoadingState message={`Opening ${ownerLabel}'s workspace…`} />
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <RivalVideoShell footerTint="light">
      <Link
        href="/"
        className="mb-8 rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
      >
        <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
      </Link>
      {children}
    </RivalVideoShell>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center text-gray-600">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      <p className="text-[15px] font-medium">{message}</p>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className={`w-full max-w-[440px] ${glassPanelClass} text-center`}>
      <p className="text-[15px] font-medium text-[#b42318]">{message}</p>
      <Link
        href="/login"
        className="mt-4 inline-block text-[14px] font-semibold text-gray-900 underline underline-offset-2"
      >
        Go to login
      </Link>
    </div>
  );
}
