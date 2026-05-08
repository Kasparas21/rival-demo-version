"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { glassPanelClass } from "@/components/ui/glass-styles";

const glassInputWrap =
  "mt-2 rounded-2xl border border-white/60 bg-white/35 px-4 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] backdrop-blur-sm transition focus-within:border-white/75 focus-within:bg-white/45 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_28px_rgba(31,38,135,0.08)]";

const glassInputField =
  "w-full border-none bg-transparent py-3 text-[15px] font-medium tracking-wide text-gray-900 outline-none placeholder:text-gray-600 focus:ring-0";

export function ForgotPasswordForm({ initialEmail = "" }: { initialEmail?: string }) {
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email");
  const [email, setEmail] = useState(
    emailFromUrl && emailFromUrl.trim() !== "" ? emailFromUrl : initialEmail
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const rawNextQuery = searchParams.get("next");
  const loginHref = rawNextQuery
    ? `/login?next=${encodeURIComponent(rawNextQuery)}`
    : "/login";

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      setStatus(null);
      return;
    }
    setPending(true);
    setError(null);
    setStatus(null);

    const res = await fetch("/api/auth/send-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    let payload: { ok?: boolean; error?: string } = {};
    try {
      payload = (await res.json()) as { ok?: boolean; error?: string };
    } catch {
      /* ignore */
    }
    setPending(false);

    if (!res.ok && res.status !== 503) {
      setError(payload.error ?? "Could not send reset email.");
      return;
    }

    if (res.status === 503) {
      setError(payload.error ?? "Email is not configured. Contact support.");
      return;
    }

    setStatus(
      "If an account exists for that email, we sent a reset link. Check your inbox and spam folder."
    );
  };

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
          Forgot password?
        </h2>
        <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-gray-600">
          Enter your email and we&apos;ll send you a secure link to choose a new password.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div>
            <label htmlFor="forgot-email" className="text-[13px] font-semibold text-gray-900">
              Email address
            </label>
            <div className={glassInputWrap}>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="yourstore@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={glassInputField}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-0 w-full rounded-full bg-gray-900 px-5 py-3.5 text-[14px] font-semibold tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:scale-100"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>

        {status ? (
          <p className="mt-4 text-[13px] font-medium leading-relaxed text-[#1d4f2f]">{status}</p>
        ) : null}
        {error ? <p className="mt-4 text-[13px] text-[#b42318]">{error}</p> : null}

        <p className="mt-6 text-center text-[14px] text-gray-600">
          Remember your password?{" "}
          <Link href={loginHref} className="font-semibold text-gray-900 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </RivalVideoShell>
  );
}
