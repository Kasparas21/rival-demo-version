"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MetaLogo,
  GoogleLogo,
  LinkedInLogo,
  SnapchatLogo,
  TikTokLogo,
  PinterestLogo,
} from "./platform-logos";

export const CHANNELS = [
  { id: "meta", name: "Meta ads", Logo: MetaLogo },
  { id: "google", name: "Google ads", Logo: GoogleLogo },
  { id: "tiktok", name: "TikTok ads", Logo: TikTokLogo },
  { id: "linkedin", name: "LinkedIn ads", Logo: LinkedInLogo },
  { id: "pinterest", name: "Pinterest ads", Logo: PinterestLogo },
  { id: "snapchat", name: "Snapchat ads", Logo: SnapchatLogo },
] as const;

export type ChannelId = (typeof CHANNELS)[number]["id"];

/** Default when opening the picker — exported for ads-library defaults */
export const DEFAULT_SELECTED_CHANNELS: ChannelId[] = ["meta", "google"];

interface ChannelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedChannels: ChannelId[]) => void;
  competitorQuery: string;
}

export function ChannelPickerModal({
  isOpen,
  onClose,
  onConfirm,
  competitorQuery,
}: ChannelPickerModalProps) {
  const [selected, setSelected] = useState<Set<ChannelId>>(() => new Set(DEFAULT_SELECTED_CHANNELS));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(DEFAULT_SELECTED_CHANNELS));
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const toggle = (id: ChannelId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(CHANNELS.map((c) => c.id)));
  const selectNone = () => setSelected(new Set());

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  const displayQuery =
    competitorQuery.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || competitorQuery;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div
          key="channel-picker-overlay"
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-0 bg-black/25 backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-[#e8e8e8] bg-white shadow-[0_24px_64px_rgba(31,38,135,0.14)] sm:max-h-[min(88dvh,680px)] sm:rounded-[24px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="channel-picker-title"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-[#f1f5f9] px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2
                    id="channel-picker-title"
                    className="font-serif text-[20px] font-semibold leading-snug tracking-tight text-[#343434] sm:text-[22px]"
                  >
                    Choose which platforms to show
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#64748b] sm:text-[14px]">
                    Tap a logo to hide or show that section.
                  </p>
                  <div className="mt-3 inline-flex max-w-full items-center rounded-full border border-[#DDF1FD] bg-[#DDF1FD]/40 px-3 py-1.5">
                    <span className="truncate text-[13px] font-semibold text-[#343434]" title={displayQuery}>
                      {displayQuery}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#64748b] transition-colors hover:bg-[#f4f4f5] hover:text-[#343434]"
                  aria-label="Close"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[13px] font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8]"
                >
                  Select all
                </button>
                <span className="text-[#e2e8f0]" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-[13px] font-semibold text-[#64748b] transition-colors hover:text-[#343434]"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Scrollable grid — 3 columns on wide modal avoids orphan row */}
            <div className="rival-subtle-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {CHANNELS.map((channel) => {
                  const isSelected = selected.has(channel.id);
                  const Logo = channel.Logo;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => toggle(channel.id)}
                      className={[
                        "flex min-h-[52px] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150 outline-none",
                        "focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/50 focus-visible:ring-offset-2",
                        isSelected
                          ? "border-[#343434]/85 bg-white shadow-[0_2px_12px_rgba(52,52,52,0.06)]"
                          : "border-transparent bg-[#f8fafc] hover:border-[#e2e8f0] hover:bg-[#f1f5f9]",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors",
                          isSelected ? "bg-white ring-[#343434]/15" : "bg-white ring-[#e2e8f0]",
                        ].join(" ")}
                      >
                        {Logo ? <Logo className="size-[22px]" /> : <div className="size-[22px] rounded bg-[#e2e8f0]" />}
                      </div>
                      <span
                        className={[
                          "min-w-0 flex-1 text-[13px] font-semibold leading-snug",
                          isSelected ? "text-[#343434]" : "text-[#475569]",
                        ].join(" ")}
                      >
                        {channel.name}
                      </span>
                      <div
                        className={[
                          "flex size-5 shrink-0 items-center justify-center rounded-full transition-colors",
                          isSelected ? "bg-[#343434] text-white" : "border border-[#cbd5e1] bg-white text-transparent",
                        ].join(" ")}
                        aria-hidden
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-[#f1f5f9] bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selected.size === 0}
                className="flex h-[50px] w-full items-center justify-center rounded-[18px] bg-[#343434] text-[15px] font-semibold text-white shadow-md transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#343434]"
              >
                {selected.size === 0
                  ? "Pick at least one platform"
                  : `Search ${selected.size} platform${selected.size === 1 ? "" : "s"}`}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
