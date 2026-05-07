"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RivalLogoImg } from "@/components/rival-logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const HERO_VIDEO_SRC = "/smooth_animation_for_202603181849.mp4";

function buildRedirectTo(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingGoogle, setIsSendingGoogle] = useState(false);
  /** Admin-backed sign-in on local machine (`next dev` or `next start` on localhost). Opt out: NEXT_PUBLIC_DEV_INSTANT_EMAIL_LOGIN=false */
  const [useDevInstantEmailLogin, setUseDevInstantEmailLogin] = useState(
    () => process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_INSTANT_EMAIL_LOGIN !== "false"
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_INSTANT_EMAIL_LOGIN === "false") {
      setUseDevInstantEmailLogin(false);
      return;
    }
    if (process.env.NODE_ENV === "development") {
      setUseDevInstantEmailLogin(true);
      return;
    }
    const h = window.location.hostname.toLowerCase();
    setUseDevInstantEmailLogin(h === "localhost" || h === "127.0.0.1" || h === "[::1]");
  }, []);

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

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildRedirectTo(`/auth/callback?next=${encodeURIComponent(next)}`),
      },
    });

    if (error) {
      setGoogleError(error.message);
      setIsSendingGoogle(false);
      return;
    }

    if (data.url) {
      router.push(data.url);
      return;
    }

    setIsSendingGoogle(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f2f4f8]">
      {/* Same video as marketing hero — no filters (native brightness) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover"
        aria-hidden
      >
        <source src={HERO_VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Light wash — keep low opacity so the video stays vivid */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[min(600px,90vw)] w-[min(600px,90vw)] rounded-full bg-[#E9F1B5]/28 blur-[130px]" />
        <div className="absolute right-[-10%] top-[0%] h-[min(700px,95vw)] w-[min(700px,95vw)] rounded-full bg-[#F3E3FF]/32 blur-[150px]" />
        <div className="absolute left-[20%] bottom-[0%] h-[min(500px,80vw)] w-[min(500px,80vw)] rounded-full bg-[#DDF1FD]/28 blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/18 via-white/10 to-white/14" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#e8ecf4]/22 to-transparent" />
      </div>

      <div className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <Link
          href="/"
          className="mb-8 rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
        >
          <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
        </Link>

        {/* Same liquid glass as hero search (`animated-glowing-search-bar`) */}
        <div className="w-full max-w-[440px] rounded-[28px] border border-white/60 bg-white/40 px-7 py-9 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] sm:px-10 sm:py-10">
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
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[15px] font-semibold leading-none text-[#4285F4] shadow-sm ring-1 ring-gray-900/10">
              G
            </span>
            {isSendingGoogle ? "Opening Google…" : "Continue with Google"}
          </button>

          {googleError ? <p className="mt-4 text-[13px] text-[#b42318]">{googleError}</p> : null}

          <p className="mt-7 text-center text-[12px] leading-relaxed text-gray-600">
            New to Rival?{" "}
            <span className="font-semibold text-gray-900">Your workspace will be created automatically.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
