"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RivalLogoImg } from "@/components/rival-logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
    <div className="relative min-h-screen overflow-hidden bg-[#f3f1f4]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-[520px] w-[520px] rounded-full bg-[#dff3c9] blur-[140px]" />
        <div className="absolute right-[-160px] top-24 h-[520px] w-[520px] rounded-full bg-[#d7cbff] blur-[160px]" />
        <div className="absolute left-[35%] top-[30%] h-[360px] w-[360px] rounded-full bg-[#f9f5f2] blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1200px] flex-col gap-12 px-6 py-12 lg:flex-row lg:items-center">
        <div className="flex-1">
          <RivalLogoImg className="h-9 w-auto max-w-[200px] object-contain object-left sm:h-10" />
          <div className="mt-10 flex flex-col items-center lg:items-start">
            <div className="h-[260px] w-[260px] rounded-[40px] bg-[#efe9ff] shadow-lg" />
            <div className="-mt-10 rounded-[14px] border border-[#caa9ff] bg-[#b98be8] px-6 py-3 text-sm font-semibold text-white shadow-md">
              Your AI media buyer is waiting.
            </div>
            <h1 className="mt-6 text-2xl font-semibold text-gray-900">
              Steal the Brain of a
              <br />
              $100M Media Buyer
            </h1>
            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-400 text-xs">
                  ✓
                </span>
                Creative Generation
                <span className="text-gray-500">(No designers needed)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-400 text-xs">
                  ✓
                </span>
                Autonomous Media Buying
                <span className="text-gray-500">(Stops bad ads instantly)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-400 text-xs">
                  ✓
                </span>
                Launch in under 5 minutes
                <span className="text-gray-500">(Full setup included)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex-1">
          <div className="mx-auto max-w-[520px] rounded-[26px] bg-white/70 p-10 shadow-xl backdrop-blur">
            <h2 className="text-3xl font-semibold text-gray-900">Welcome back</h2>
            <p className="mt-3 text-sm text-gray-500">
              Sign in to save competitors, keep your search history, and continue where you left off.
            </p>

            <div className="mt-8">
              <label className="text-sm font-semibold text-gray-700">Email address</label>
              <input
                type="email"
                placeholder="yourstore@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-3 w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={handleEmailSignIn}
              disabled={isSendingEmail}
              className="mt-6 w-full rounded-full bg-[#323232] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSendingEmail ? "Sending secure link..." : "Continue with Email"}
            </button>

            {emailStatus ? <p className="mt-4 text-sm text-[#2f6f44]">{emailStatus}</p> : null}
            {emailError ? <p className="mt-4 text-sm text-[#b42318]">{emailError}</p> : null}

            <div className="mt-6 flex items-center gap-3 text-xs text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              or
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSendingGoogle}
              className="mt-6 w-full rounded-full border border-gray-200 bg-white px-6 py-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-base">
                G
              </span>
              {isSendingGoogle ? "Opening Google..." : "Continue with Google"}
            </button>

            {googleError ? <p className="mt-4 text-sm text-[#b42318]">{googleError}</p> : null}

            <p className="mt-6 text-center text-xs text-gray-500">
              New to Rival? <span className="font-semibold text-gray-800">Your workspace will be created automatically.</span>
            </p>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300">
                L
              </span>
              Secure encrypted login
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
