"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
};

export function ScreenshotCompareViewer({
  open,
  onClose,
  beforeUrl,
  afterUrl,
  beforeLabel = "Before",
  afterLabel = "After",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const mirrorScroll = useCallback((source: HTMLDivElement, target: HTMLDivElement) => {
    if (syncing.current) return;
    syncing.current = true;
    target.scrollTop = source.scrollTop;
    target.scrollLeft = source.scrollLeft;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, []);

  const singleView = beforeUrl === afterUrl;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[210] flex items-stretch justify-center bg-black/50 p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={
              singleView
                ? "relative flex min-h-0 w-full max-w-3xl flex-1 flex-col"
                : "relative flex min-h-0 w-full max-w-[1400px] flex-1 flex-col"
            }
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-20 rounded-lg bg-white p-2 text-slate-600 shadow-md ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>

            {singleView ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="min-h-0 flex-1 overflow-auto pt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={beforeUrl} alt="Full page screenshot" className="block w-full" />
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 pt-10 md:grid-cols-2">
                {[
                  { label: beforeLabel, url: beforeUrl, ref: leftRef, other: rightRef },
                  { label: afterLabel, url: afterUrl, ref: rightRef, other: leftRef },
                ].map((panel) => (
                  <div
                    key={panel.label}
                    className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-white shadow-xl"
                  >
                    <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                      {panel.label}
                    </div>
                    <div
                      ref={panel.ref}
                      className="min-h-0 flex-1 overflow-auto"
                      onScroll={(e) => {
                        const other = panel.other.current;
                        if (other) mirrorScroll(e.currentTarget, other);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={panel.url} alt={panel.label} className="block w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
