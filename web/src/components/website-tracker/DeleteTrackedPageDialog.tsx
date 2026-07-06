"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { displayUrlShort } from "@/lib/landing-pages/normalize-url";

type Props = {
  label: string;
  url: string;
  deleting?: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
};

export function DeleteTrackedPageDialog({
  label,
  url,
  deleting = false,
  onDismiss,
  onConfirm,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const urlLabel = displayUrlShort(url, 48) || url;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 sm:items-center sm:justify-center sm:pb-4 sm:pt-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#0f0f12]/45 backdrop-blur-[3px] motion-reduce:backdrop-blur-none"
        aria-label="Cancel"
        onClick={onDismiss}
        disabled={deleting}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-tracked-page-title"
        className="relative z-[1] w-full max-w-[400px] rounded-2xl border border-[#e8e8e8]/95 bg-white p-6 shadow-[0_24px_80px_rgba(31,38,135,0.15)]"
      >
        <p
          id="delete-tracked-page-title"
          className="text-[17px] font-semibold leading-snug tracking-tight text-[#1a1a2e]"
        >
          Remove &ldquo;{label}&rdquo;?
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[#52525b]">
          This stops tracking{" "}
          <span className="font-medium text-[#3f3f46]">{urlLabel}</span> and permanently deletes all
          screenshots and change history for this page.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            disabled={deleting}
            className="w-full rounded-xl border border-[#e4e4e7] bg-white px-4 py-2.5 text-[14px] font-medium text-[#3f3f46] outline-none transition-colors hover:bg-[#fafafa] hover:text-[#18181b] focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/40 disabled:opacity-60 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="w-full rounded-xl bg-[#b42318] px-4 py-2.5 text-[14px] font-medium text-white outline-none transition-colors hover:bg-[#9a1d14] focus-visible:ring-2 focus-visible:ring-[#b42318]/50 focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
          >
            {deleting ? "Removing…" : "Remove page"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
