"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { glassPanelClass } from "@/components/ui/glass-styles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Google } from "@/components/icons/google-logo";
import { DevLocalAuthPanel } from "@/components/auth/dev-local-auth-panel";
import { buildAuthCallbackPath } from "@/lib/auth/build-email-token-callback-url";
import { rememberOAuthNext, rememberOAuthTesterInvite } from "@/lib/auth/oauth-bridge-cookies";
import { safeAuthNextPath } from "@/lib/auth/auth-page-helpers";
import { CHOOSE_PLAN_AFTER_TRIAL_PATH } from "@/lib/auth/trial-flow";
import { hasOnboardingDraft } from "@/lib/onboarding/draft";
import { TESTER_INVITE_METADATA_KEY } from "@/lib/billing/tester-invite-user";

function buildRedirectTo(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

const glassInputWrap =
  "mt-2 rounded-2xl border border-white/60 bg-white/35 px-4 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] backdrop-blur-sm transition focus-within:border-white/75 focus-within:bg-white/45 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_28px_rgba(31,38,135,0.08)]";

const glassInputField =
  "w-full border-none bg-transparent py-3 text-[15px] font-medium tracking-wide text-gray-900 outline-none placeholder:text-gray-600 focus:ring-0";

export function SignupForm({ testerInviteCode = null }: { testerInviteCode?: string | null }) {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const next =
    safeAuthNextPath(searchParams.get("next"), "/signup") ??
    (hasOnboardingDraft() ? CHOOSE_PLAN_AFTER_TRIAL_PATH : "/dashboard/spy");
  const urlAuthError = searchParams.get("error");
  const rawNextQuery = searchParams.get("next");
  const rawTesterQuery = searchParams.get("tester");
  const loginHref = (() => {
    const params = new URLSearchParams();
    if (rawNextQuery) params.set("next", rawNextQuery);
    if (rawTesterQuery) params.set("tester", rawTesterQuery);
    const qs = params.toString();
    return qs ? `/login?${qs}` : "/login";
  })();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingGoogle, setIsSendingGoogle] = useState(false);

  const handleSignUp = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFormError("Enter your email address first.");
      return;
    }
    if (!password) {
      setFormError("Choose a password.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords don't match");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setInfoMessage(null);
    setGoogleError(null);

    const effectiveNext = safeAuthNextPath(searchParams.get("next"), "/signup") ?? "/dashboard/spy";

    const res = await fetch("/api/auth/sign-up-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: trimmed,
        password,
        next: effectiveNext,
        ...(testerInviteCode ? { testerInvite: testerInviteCode } : {}),
      }),
    });
    let payload: { ok?: boolean; error?: string } = {};
    try {
      payload = (await res.json()) as { ok?: boolean; error?: string };
    } catch {
      /* non-JSON */
    }

    setIsSubmitting(false);

    if (!res.ok) {
      setFormError(payload.error ?? "Could not complete signup.");
      return;
    }

    if (!payload.ok) {
      setFormError("Could not complete signup.");
      return;
    }

    setInfoMessage(
      "Check your inbox for a confirmation email from us. Open the link to finish signup, then you can sign in."
    );
  };

  const handleGoogleSignIn = async () => {
    setIsSendingGoogle(true);
    setGoogleError(null);
    setFormError(null);
    rememberOAuthNext(next);
    rememberOAuthTesterInvite(testerInviteCode);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildRedirectTo(buildAuthCallbackPath(next, testerInviteCode)),
        queryParams: {
          prompt: "select_account",
        },
        ...(testerInviteCode
          ? {
              data: {
                [TESTER_INVITE_METADATA_KEY]: testerInviteCode,
              },
            }
          : {}),
      },
    });

    if (error) {
      setGoogleError(error.message);
      setIsSendingGoogle(false);
      return;
    }

    if (data.url) {
      window.location.assign(data.url);
      return;
    }

    setIsSendingGoogle(false);
  };

  const linkMutedClass = "mt-4 text-center text-[14px] text-gray-600";

  return (
    <RivalVideoShell footerTint="light">
      <Link
        href="/"
        className="mb-8 rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
      >
        <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
      </Link>

      <div className={`w-full max-w-[440px] ${glassPanelClass}`}>
        <h2 className="text-[1.65rem] font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]">
          Create your account
        </h2>
        <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-gray-600">
          Enter your email and choose a password.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSignUp();
          }}
        >
          <div>
            <label htmlFor="signup-email" className="text-[13px] font-semibold text-gray-900">
              Email address
            </label>
            <div className={glassInputWrap}>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="yourstore@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={glassInputField}
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password" className="text-[13px] font-semibold text-gray-900">
              Password
            </label>
            <div className={glassInputWrap}>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="Choose a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={glassInputField}
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password-confirm" className="text-[13px] font-semibold text-gray-900">
              Confirm password
            </label>
            <div className={glassInputWrap}>
              <input
                id="signup-password-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={glassInputField}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-0 w-full rounded-full bg-gray-900 px-5 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:scale-100"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        {urlAuthError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-[#b42318]">
            {urlAuthError}
          </p>
        ) : null}
        {infoMessage ? <p className="mt-4 text-[13px] font-medium text-[#1d4f2f]">{infoMessage}</p> : null}
        {formError ? <p className="mt-4 text-[13px] text-[#b42318]">{formError}</p> : null}

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

        <DevLocalAuthPanel
          email={email}
          nextPath={safeAuthNextPath(searchParams.get("next"), "/signup") ?? "/onboarding"}
        />

        <p className={linkMutedClass}>
          Already have an account?{" "}
          <Link href={loginHref} className="font-semibold text-gray-900 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </RivalVideoShell>
  );
}
