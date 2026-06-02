"use client";

import { useEffect, useState } from "react";
import type { SignupCopy } from "@/lib/i18n/auth/types";
import { authCopyEn } from "@/lib/i18n/auth/en";

function isBrowserLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const hn = window.location.hostname.toLowerCase();
  return hn === "localhost" || hn === "127.0.0.1" || hn === "[::1]";
}

type DevPanelCopy = SignupCopy["devPanel"];

type Props = {
  email: string;
  nextPath: string;
  copy?: DevPanelCopy;
};

/** Shown on /login and /signup when running on localhost — skips Resend email. */
export function DevLocalAuthPanel({ email, nextPath, copy = authCopyEn.signup.devPanel }: Props) {
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
      setError(copy.emailRequired);
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
        setError(json.error ?? copy.instantFailed);
        return;
      }
      window.location.assign(json.actionLink);
    } catch {
      setError(copy.endpointFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-dashed border-amber-300/90 bg-amber-50/70 px-3 py-3 text-[12px] text-amber-950">
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1 leading-snug text-amber-900/90">{copy.body}</p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleInstant()}
        className="mt-2 w-full rounded-full border border-amber-400/80 bg-white/60 py-2.5 text-[13px] font-semibold text-amber-950 transition hover:bg-white/80 disabled:opacity-50"
      >
        {loading ? copy.signingIn : copy.continueWithoutEmail}
      </button>
      {error ? <p className="mt-2 text-[11px] font-medium text-red-700">{error}</p> : null}
      <p className="mt-2 text-[11px] text-amber-800/90">
        {copy.testOnboarding}{" "}
        <a href="/login?next=%2Fonboarding" className="font-semibold underline underline-offset-2">
          /login?next=/onboarding
        </a>
      </p>
    </div>
  );
}
