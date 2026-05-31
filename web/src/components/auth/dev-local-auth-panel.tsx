"use client";

import { useEffect, useState } from "react";

function isBrowserLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const hn = window.location.hostname.toLowerCase();
  return hn === "localhost" || hn === "127.0.0.1" || hn === "[::1]";
}

type Props = {
  email: string;
  nextPath: string;
};

/** Shown on /login and /signup when running on localhost — skips Resend email. */
export function DevLocalAuthPanel({ email, nextPath }: Props) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShow(isBrowserLocalHost());
  }, []);

  if (!show) return null;

  const handleInstant = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email above first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/dev-instant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, next: nextPath }),
      });
      const json = (await res.json()) as { actionLink?: string; error?: string };
      if (!res.ok || !json.actionLink) {
        setError(json.error ?? "Instant sign-in failed");
        return;
      }
      window.location.assign(json.actionLink);
    } catch {
      setError("Could not reach dev sign-in endpoint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-dashed border-amber-300/90 bg-amber-50/70 px-3 py-3 text-[12px] text-amber-950">
      <p className="font-semibold">Local dev — no email</p>
      <p className="mt-1 leading-snug text-amber-900/90">
        Sign in instantly (uses service role). Confirmation links from signup also stay on localhost while you develop
        here.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleInstant()}
        className="mt-2 w-full rounded-full border border-amber-400/80 bg-white/60 py-2.5 text-[13px] font-semibold text-amber-950 transition hover:bg-white/80 disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Continue without email (localhost)"}
      </button>
      {error ? <p className="mt-2 text-[11px] font-medium text-red-700">{error}</p> : null}
      <p className="mt-2 text-[11px] text-amber-800/90">
        Test onboarding:{" "}
        <a href="/login?next=%2Fonboarding" className="font-semibold underline underline-offset-2">
          /login?next=/onboarding
        </a>
      </p>
    </div>
  );
}
