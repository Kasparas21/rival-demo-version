"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  showReplay?: boolean;
};

export function OnboardingDevHints({ showReplay }: Props) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_REPLAY_ONBOARDING !== "true") {
    return null;
  }

  const handleReset = async () => {
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch("/api/dev/reset-onboarding", { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setResetError(json.error ?? "Reset failed");
        return;
      }
      router.refresh();
    } catch {
      setResetError("Could not reach server");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mt-6 w-full max-w-[440px] rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-center text-[12px] leading-relaxed text-amber-950 backdrop-blur-sm">
      <p className="font-semibold">Local dev</p>
      <p className="mt-1 text-amber-900/90">
        Signup / reset emails use <span className="font-mono">localhost</span> when you run the app locally — not{" "}
        <span className="font-mono">NEXT_PUBLIC_APP_URL</span>.
        {showReplay ? " Replay mode: onboarding won’t auto-redirect." : null}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <a href="/onboarding?replay=1" className="font-semibold underline underline-offset-2">
          Open replay (?replay=1)
        </a>
        <button
          type="button"
          disabled={resetting}
          onClick={() => void handleReset()}
          className="font-semibold underline underline-offset-2 disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "Reset onboarding flag"}
        </button>
      </div>
      {resetError ? <p className="mt-2 text-[11px] font-medium text-red-700">{resetError}</p> : null}
    </div>
  );
}
