"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { glassPanelClass } from "@/components/ui/glass-styles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Google } from "@/components/icons/google-logo";
import { DevLocalAuthPanel } from "@/components/auth/dev-local-auth-panel";
import { buildAuthCallbackPath } from "@/lib/auth/build-email-token-callback-url";
import { rememberOAuthNext, rememberOAuthTeamInviteToken, rememberOAuthTesterInvite } from "@/lib/auth/oauth-bridge-cookies";
import { safeAuthNextPath } from "@/lib/auth/auth-page-helpers";
import { isPostGuestSignupPath } from "@/lib/auth/trial-flow";
import { TESTER_INVITE_METADATA_KEY } from "@/lib/billing/tester-invite-user";
import { parseTeamInviteTokenFromPath } from "@/lib/team/team-invite-by-token";

function looksLikeWrongPasswordAttempt(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("invalid login credentials") ||
    m.includes("invalid email or password") ||
    m.includes("wrong password") ||
    m.includes("incorrect password")
  );
}

function buildRedirectTo(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

const glassInputWrap =
  "mt-2 rounded-2xl border border-white/60 bg-white/35 px-4 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] backdrop-blur-sm transition focus-within:border-white/75 focus-within:bg-white/45 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_28px_rgba(31,38,135,0.08)]";

const glassInputField =
  "w-full border-none bg-transparent py-3 text-[15px] font-medium tracking-wide text-gray-900 outline-none placeholder:text-gray-600 focus:ring-0";

export type LoginFormProps = {
  testerInviteCode?: string | null;
  /** Overrides `?next=` from the URL (e.g. team invite accept path). */
  nextPath?: string;
  initialEmail?: string;
  lockEmail?: boolean;
  heading?: string;
  description?: string;
  hideSignup?: boolean;
  /** Render only the glass panel - caller provides outer shell. */
  embedded?: boolean;
  /** When set, called after successful password sign-in instead of navigating. */
  onSignedIn?: () => void | Promise<void>;
};

export function LoginForm({
  testerInviteCode = null,
  nextPath: nextPathProp,
  initialEmail = "",
  lockEmail = false,
  heading = "Sign in to Rival",
  description = "Enter your email and password to continue.",
  hideSignup = false,
  embedded = false,
  onSignedIn,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const rawNextQuery = searchParams.get("next");
  const rawTesterQuery = searchParams.get("tester");
  const next =
    safeAuthNextPath(nextPathProp ?? rawNextQuery, "/login") ?? "/dashboard/spy";
  const urlAuthError = searchParams.get("error");
  const notice = searchParams.get("notice");
  const signupHref = (() => {
    const params = new URLSearchParams();
    const nextForSignup = nextPathProp ?? rawNextQuery;
    if (nextForSignup) params.set("next", nextForSignup);
    if (rawTesterQuery) params.set("tester", rawTesterQuery);
    const trimmedEmail = initialEmail.trim();
    if (trimmedEmail) params.set("email", trimmedEmail);
    const qs = params.toString();
    return qs ? `/signup?${qs}` : "/signup";
  })();
  const [email, setEmail] = useState(initialEmail);
  const forgotPasswordHref = useMemo(() => {
    const params = new URLSearchParams();
    const nextForForgot = nextPathProp ?? rawNextQuery;
    if (nextForForgot) params.set("next", nextForForgot);
    const trimmed = email.trim();
    if (trimmed) params.set("email", trimmed);
    const qs = params.toString();
    return qs ? `/forgot-password?${qs}` : "/forgot-password";
  }, [nextPathProp, rawNextQuery, email]);
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSendingGoogle, setIsSendingGoogle] = useState(false);

  const handlePasswordSignIn = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFormError("Enter your email address first.");
      return;
    }
    if (lockEmail && initialEmail.trim()) {
      const locked = initialEmail.trim().toLowerCase();
      if (trimmed.toLowerCase() !== locked) {
        setFormError(`Sign in with ${initialEmail.trim()}.`);
        return;
      }
    }
    if (!password) {
      setFormError("Enter your password.");
      return;
    }

    setIsSigningIn(true);
    setFormError(null);
    setGoogleError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });

    if (error) {
      setIsSigningIn(false);
      setFormError(error.message);
      return;
    }

    if (onSignedIn) {
      try {
        await onSignedIn();
      } finally {
        setIsSigningIn(false);
      }
      return;
    }

    setIsSigningIn(false);

    if (isPostGuestSignupPath(next)) {
      window.location.assign(next);
      return;
    }
    router.refresh();
    router.replace(next);
  };

  const handleGoogleSignIn = async () => {
    setIsSendingGoogle(true);
    setGoogleError(null);
    setFormError(null);
    rememberOAuthNext(next);
    rememberOAuthTesterInvite(testerInviteCode);
    const teamInviteToken = parseTeamInviteTokenFromPath(next);
    if (teamInviteToken) {
      rememberOAuthTeamInviteToken(teamInviteToken);
    }

    const loginHint = lockEmail && initialEmail.trim() ? initialEmail.trim() : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildRedirectTo(buildAuthCallbackPath(next, testerInviteCode)),
        queryParams: {
          prompt: "select_account",
          ...(loginHint ? { login_hint: loginHint } : {}),
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

  const panel = (
    <div className={`w-full max-w-[440px] ${glassPanelClass}`}>
      <h2 className="text-[1.65rem] font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]">
        {heading}
      </h2>
      <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-gray-600">{description}</p>

      {notice === "password_reset" ? (
        <p className="mt-4 rounded-xl border border-[#b7dfc6] bg-[#edfdf3] px-3 py-2 text-[13px] font-medium text-[#1d4f2f]">
          Your password was updated. Sign in with your new password below.
        </p>
      ) : null}

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handlePasswordSignIn();
        }}
      >
        <div>
          <label htmlFor="login-email" className="text-[13px] font-semibold text-gray-900">
            Email address
          </label>
          <div className={glassInputWrap}>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="yourstore@example.com"
              value={email}
              readOnly={lockEmail}
              onChange={(event) => {
                if (!lockEmail) setEmail(event.target.value);
              }}
              className={`${glassInputField}${lockEmail ? " cursor-default text-gray-700" : ""}`}
            />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="login-password" className="text-[13px] font-semibold text-gray-900">
              Password
            </label>
            <Link
              href={forgotPasswordHref}
              className="text-[13px] font-semibold text-gray-900 underline underline-offset-2"
            >
              Forgot password?
            </Link>
          </div>
          <div className={glassInputWrap}>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={glassInputField}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSigningIn}
          className="mt-0 w-full rounded-full bg-gray-900 px-5 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:scale-100"
        >
          {isSigningIn ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {urlAuthError ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-[#b42318]">
          {urlAuthError}
        </p>
      ) : null}
      {formError ? (
        <div className="mt-4 space-y-2">
          <p className="text-[13px] text-[#b42318]">{formError}</p>
          {looksLikeWrongPasswordAttempt(formError) ? (
            <p className="text-[13px] font-medium text-gray-600">
              If you forgot it,{" "}
              <Link href={forgotPasswordHref} className="font-semibold text-gray-900 underline underline-offset-2">
                reset your password via email
              </Link>
              .
            </p>
          ) : null}
        </div>
      ) : null}

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
        {isSendingGoogle ? "Opening Google..." : "Continue with Google"}
      </button>

      {googleError ? <p className="mt-4 text-[13px] text-[#b42318]">{googleError}</p> : null}

      <DevLocalAuthPanel email={email} nextPath={next} />

      {!hideSignup ? (
        <p className={linkMutedClass}>
          Don&apos;t have an account?{" "}
          <Link href={signupHref} className="font-semibold text-gray-900 underline underline-offset-2">
            Sign up
          </Link>
        </p>
      ) : null}
    </div>
  );

  if (embedded) {
    return panel;
  }

  return (
    <RivalVideoShell footerTint="light">
      <Link
        href="/"
        className="mb-8 rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
      >
        <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
      </Link>
      {panel}
    </RivalVideoShell>
  );
}
