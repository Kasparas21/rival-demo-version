"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Loader2 } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { glassPanelClass } from "@/components/ui/glass-styles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clearSidebarCompetitorsForWorkspaceSwitch } from "@/lib/sidebar-competitors";
import { normalizeInviteEmail } from "@/lib/team/invite-limits";

type InvitePreview = {
  ok: boolean;
  status?: string;
  invitedEmail?: string;
  invitedEmailMasked?: string;
  owner?: { displayLabel: string };
  error?: string;
};

function emailsMatch(sessionEmail: string | null | undefined, invitedEmail: string): boolean {
  if (!sessionEmail?.trim()) return false;
  return normalizeInviteEmail(sessionEmail) === normalizeInviteEmail(invitedEmail);
}

type AuthState = "pending" | "guest" | "matched" | "mismatch";

export function TeamAcceptInviteClient({ token }: { token: string }) {
  const acceptPath = `/team/accept/${token}`;
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>("pending");
  const autoAcceptedRef = useRef(false);

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

  const acceptInvite = useCallback(async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/invite/${encodeURIComponent(token)}`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error ?? "Could not accept invite");
      }
      clearSidebarCompetitorsForWorkspaceSwitch();
      window.location.href = "/dashboard/spy";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not accept invite";
      setError(message);
      if (message.toLowerCase().includes("sign in as")) {
        setAuthState("mismatch");
      }
      setAccepting(false);
    }
  }, [token]);

  const tryAcceptForUser = useCallback(
    async (userEmail: string | null | undefined) => {
      const invitedEmail = preview?.invitedEmail?.trim();
      if (!invitedEmail) return;

      if (!emailsMatch(userEmail, invitedEmail)) {
        setAuthState("mismatch");
        setError(`This invite was sent to ${invitedEmail}. Sign out and sign in with that email.`);
        return;
      }

      if (autoAcceptedRef.current) return;
      autoAcceptedRef.current = true;
      setAuthState("matched");
      setAccepting(true);
      await acceptInvite();
    },
    [acceptInvite, preview?.invitedEmail],
  );

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (loading || !preview?.invitedEmail) return;

    const supabase = createSupabaseBrowserClient();
    void supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          setAuthState("guest");
          return;
        }
        void tryAcceptForUser(user.email);
      })
      .catch(() => setAuthState("guest"));
  }, [loading, preview?.invitedEmail, tryAcceptForUser]);

  const handleSignedIn = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setError(null);
    await tryAcceptForUser(user?.email);
  }, [tryAcceptForUser]);

  const handleSignOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    autoAcceptedRef.current = false;
    setAuthState("guest");
    setError(null);
    setAccepting(false);
  }, []);

  const ownerLabel = preview?.owner?.displayLabel ?? "A teammate";
  const invitedEmail = preview?.invitedEmail?.trim() ?? "";

  if (loading || authState === "pending") {
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

  if (accepting || authState === "matched") {
    return (
      <InviteShell>
        <LoadingState message="Accepting invite…" />
      </InviteShell>
    );
  }

  if (authState === "mismatch") {
    return (
      <InviteShell>
        <div className={`w-full max-w-[440px] ${glassPanelClass} text-center`}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-900">
            <Eye className="h-3.5 w-3.5" />
            Wrong account
          </div>
          <p className="text-[15px] font-medium leading-relaxed text-gray-900">
            {error ?? `This invite was sent to ${invitedEmail}. Sign out and sign in with that email.`}
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-6 w-full rounded-full bg-gray-900 px-5 py-3.5 text-[14px] font-semibold text-white hover:bg-black"
          >
            Sign out and try again
          </button>
        </div>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-3 py-1.5 text-[12px] font-semibold text-amber-900 shadow-sm backdrop-blur-sm">
        <Eye className="h-3.5 w-3.5" />
        Team invite · read-only access
      </div>
      <LoginForm
        embedded
        nextPath={acceptPath}
        initialEmail={invitedEmail}
        lockEmail={Boolean(invitedEmail)}
        heading="Accept workspace invite"
        description={`${ownerLabel} invited you. Sign in with ${invitedEmail || "the invited email"} to join their workspace.`}
        onSignedIn={handleSignedIn}
      />
      {error ? (
        <p className="mt-4 max-w-[440px] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-[13px] font-medium text-[#b42318]">
          {error}
        </p>
      ) : null}
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
