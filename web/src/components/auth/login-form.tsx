"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { glassPanelClass } from "@/components/ui/glass-styles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Google } from "@/components/icons/google-logo";

function buildRedirectTo(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

function rememberOAuthNext(path: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `rival_oauth_next=${encodeURIComponent(path)}; Path=/; Max-Age=900; SameSite=Lax${secure}`;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const next = searchParams.get("next") || "/dashboard";
  const urlAuthError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingGoogle, setIsSendingGoogle] = useState(false);
  /** Bypass magic link in dev only when `NEXT_PUBLIC_DEV_INSTANT_EMAIL_LOGIN=true`. Otherwise tries Resend (`/api/auth/send-magic-link`) then falls back to Supabase email OTP + OAuth. */
  const useDevInstantEmailLogin = process.env.NEXT_PUBLIC_DEV_INSTANT_EMAIL_LOGIN === "true";

  const handleEmailSignIn = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Enter your email address first.");
      setEmailStatus(null);
      return;
    }

    setIsSendingEmail(true);
    setEmailError(null);
    setGoogleError(null);
    setEmailStatus(null);

    if (useDevInstantEmailLogin) {
      try {
        const res = await fetch("/api/auth/dev-instant-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed, next }),
        });
        const raw = await res.text();
        let payload: { actionLink?: string; error?: string } = {};
        if (raw) {
          try {
            payload = JSON.parse(raw) as { actionLink?: string; error?: string };
          } catch {
            setIsSendingEmail(false);
            setEmailError("Dev sign-in returned an invalid response.");
            return;
          }
        }

        setIsSendingEmail(false);

        if (!res.ok) {
          setEmailError(payload.error ?? "Dev sign-in failed.");
          return;
        }

        if (payload.actionLink) {
          window.location.assign(payload.actionLink);
          return;
        }

        setEmailError("Dev sign-in returned no link.");
        return;
      } catch {
        setIsSendingEmail(false);
        setEmailError("Dev sign-in request failed.");
        return;
      }
    }

    try {
      const res = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, next }),
      });
      let payload: { ok?: boolean; error?: string; fallback?: boolean } = {};
      try {
        payload = (await res.json()) as { ok?: boolean; error?: string; fallback?: boolean };
      } catch {
        /* non-JSON */
      }

      if (res.ok && payload.ok) {
        setIsSendingEmail(false);
        setEmailStatus("Check your inbox for the secure sign-in link.");
        return;
      }

      if (!(res.status === 503 && payload.fallback)) {
        setIsSendingEmail(false);
        setEmailError(payload.error ?? "Could not send sign-in email.");
        return;
      }
    } catch {
      setIsSendingEmail(false);
      setEmailError("Sign-in request failed.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: buildRedirectTo(`/auth/callback?next=${encodeURIComponent(next)}`),
      },
    });

    setIsSendingEmail(false);

    if (error) {
      setEmailError(error.message);
      return;
    }

    setEmailStatus("Check your inbox for the secure sign-in link.");
  };

  const handleGoogleSignIn = async () => {
    setIsSendingGoogle(true);
    setGoogleError(null);
    setEmailError(null);
    rememberOAuthNext(next);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildRedirectTo(`/auth/callback?next=${encodeURIComponent(next)}`),
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setGoogleError(error.message);
      setIsSendingGoogle(false);
      return;
    }

    // Must use a full navigation — Next.js router cannot reliably send the user to Google's / Supabase's OAuth URL.
    if (data.url) {
      window.location.assign(data.url);
      return;
    }

    setIsSendingGoogle(false);
  };

  return (
    <RivalVideoShell footerTint="light">
        <Link
          href="/"
          className="mb-8 rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
        >
          <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
        </Link>

        {/* Same liquid glass as hero search (`animated-glowing-search-bar`) */}
        <div className={`w-full max-w-[440px] ${glassPanelClass}`}>
          <h2 className="text-[1.65rem] font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]">
            Welcome back
          </h2>
          <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-gray-600">
            Sign in to save competitors, keep your search history, and continue where you left off.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleEmailSignIn();
            }}
          >
            <div>
              <label htmlFor="login-email" className="text-[13px] font-semibold text-gray-900">
                Email address
              </label>
              <div className="mt-2 rounded-2xl border border-white/60 bg-white/35 px-4 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] backdrop-blur-sm transition focus-within:border-white/75 focus-within:bg-white/45 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_28px_rgba(31,38,135,0.08)]">
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="yourstore@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full border-none bg-transparent py-3 text-[15px] font-medium tracking-wide text-gray-900 outline-none placeholder:text-gray-600 focus:ring-0"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSendingEmail}
              className="mt-0 w-full rounded-full bg-gray-900 px-5 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:scale-100"
            >
              {isSendingEmail
                ? useDevInstantEmailLogin
                  ? "Signing in…"
                  : "Sending secure link…"
                : "Continue with Email"}
            </button>
          </form>

          {urlAuthError ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-[#b42318]">
              {urlAuthError}
            </p>
          ) : null}
          {emailStatus ? (
            <p className="mt-4 text-[13px] font-medium text-[#1d4f2f]">{emailStatus}</p>
          ) : null}
          {emailError ? <p className="mt-4 text-[13px] text-[#b42318]">{emailError}</p> : null}

          <div className="mt-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
            <span className="h-px flex-1 bg-gray-900/10" />
            or
            <span className="h-px flex-1 bg-gray-900/10" />
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={isSendingGoogle}
            className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full border border-white/60 bg-white/35 px-5 py-3.5 text-[14px] font-semibold tracking-wide text-gray-900 shadow-[0_4px_24px_rgba(31,38,135,0.06)] backdrop-blur-sm transition hover:bg-white/45 disabled:cursor-not-allowed disabled:opacity-65"
          >
            <Google className="h-6 w-6 shrink-0" aria-hidden />
            {isSendingGoogle ? "Opening Google…" : "Continue with Google"}
          </button>

          {googleError ? <p className="mt-4 text-[13px] text-[#b42318]">{googleError}</p> : null}
        </div>
    </RivalVideoShell>
  );
}
