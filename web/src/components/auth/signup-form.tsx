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
import { OnboardingCardLocaleSwitcher } from "@/components/onboarding/onboarding-card-locale-switcher";
import type { SignupCopy } from "@/lib/i18n/auth/types";
import { localizeSignupApiError } from "@/lib/i18n/auth/signup-api-errors";
import type { Locale } from "@/lib/i18n/locale";

function buildRedirectTo(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

const glassInputWrap =
  "mt-2 rounded-2xl border border-white/60 bg-white/35 px-4 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] backdrop-blur-sm transition focus-within:border-white/75 focus-within:bg-white/45 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_28px_rgba(31,38,135,0.08)]";

const glassInputField =
  "w-full border-none bg-transparent py-3 text-[15px] font-medium tracking-wide text-gray-900 outline-none placeholder:text-gray-600 focus:ring-0";

export function SignupForm({
  copy,
  locale,
  testerInviteCode = null,
}: {
  copy: SignupCopy;
  locale: Locale;
  testerInviteCode?: string | null;
}) {
  const t = copy;
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
      setFormError(t.errors.emailRequired);
      return;
    }
    if (!password) {
      setFormError(t.errors.passwordRequired);
      return;
    }
    if (password !== confirmPassword) {
      setFormError(t.errors.passwordsMismatch);
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
        locale,
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
      setFormError(localizeSignupApiError(payload.error, t.errors));
      return;
    }

    if (!payload.ok) {
      setFormError(t.errors.signupFailed);
      return;
    }

    setInfoMessage(t.success.confirmEmail);
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
        aria-label={t.homeAria}
        className="mb-8 rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
      >
        <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
      </Link>

      <div className={`w-full max-w-[440px] ${glassPanelClass}`}>
        <div className="-mt-1 mb-4 flex justify-end">
          <OnboardingCardLocaleSwitcher locale={locale} ariaLabel={t.localeSwitcherAria} align="end" />
        </div>
        <h2 className="text-[1.65rem] font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]">{t.title}</h2>
        <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-gray-600">{t.subtitle}</p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSignUp();
          }}
        >
          <div>
            <label htmlFor="signup-email" className="text-[13px] font-semibold text-gray-900">
              {t.emailLabel}
            </label>
            <div className={glassInputWrap}>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={glassInputField}
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password" className="text-[13px] font-semibold text-gray-900">
              {t.passwordLabel}
            </label>
            <div className={glassInputWrap}>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={glassInputField}
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password-confirm" className="text-[13px] font-semibold text-gray-900">
              {t.confirmPasswordLabel}
            </label>
            <div className={glassInputWrap}>
              <input
                id="signup-password-confirm"
                type="password"
                autoComplete="new-password"
                placeholder={t.confirmPasswordPlaceholder}
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
            {isSubmitting ? t.submitting : t.submit}
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
          {t.dividerOr}
          <span className="h-px flex-1 bg-gray-900/10" />
        </div>

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={isSendingGoogle}
          className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full border border-white/60 bg-white/35 px-5 py-3.5 text-[14px] font-semibold tracking-wide text-gray-900 shadow-[0_4px_24px_rgba(31,38,135,0.06)] backdrop-blur-sm transition hover:bg-white/45 disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Google className="h-6 w-6 shrink-0" aria-hidden />
          {isSendingGoogle ? t.googleOpening : t.google}
        </button>

        {googleError ? <p className="mt-4 text-[13px] text-[#b42318]">{googleError}</p> : null}

        <DevLocalAuthPanel
          email={email}
          nextPath={safeAuthNextPath(searchParams.get("next"), "/signup") ?? "/onboarding"}
          copy={t.devPanel}
        />

        <p className={linkMutedClass}>
          {t.alreadyHaveAccount}{" "}
          <Link href={loginHref} className="font-semibold text-gray-900 underline underline-offset-2">
            {t.signIn}
          </Link>
        </p>
      </div>
    </RivalVideoShell>
  );
}
