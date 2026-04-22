"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MetaLogo,
  GoogleLogo,
  XLogo,
  LinkedInLogo,
  MicrosoftLogo,
  RedditLogo,
  SnapchatLogo,
  TikTokLogo,
  PinterestLogo,
  YouTubeLogo,
} from "./platform-logos";

export const CHANNELS = [
  { id: "meta", name: "Meta ads", Logo: MetaLogo },
  { id: "google", name: "Google ads", Logo: GoogleLogo },
  { id: "x", name: "X (Twitter) ads", Logo: XLogo },
  { id: "tiktok", name: "TikTok ads", Logo: TikTokLogo },
  { id: "youtube", name: "YouTube ads", Logo: YouTubeLogo },
  { id: "linkedin", name: "LinkedIn ads", Logo: LinkedInLogo },
  { id: "microsoft", name: "Microsoft Ads", Logo: MicrosoftLogo },
  { id: "shopping", name: "Google Shopping ads", Logo: GoogleLogo },
  { id: "pinterest", name: "Pinterest ads", Logo: PinterestLogo },
  { id: "snapchat", name: "Snapchat ads", Logo: SnapchatLogo },
  { id: "reddit", name: "Reddit ads", Logo: RedditLogo },
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(CHANNELS.map((c) => c.id)));
  const selectNone = () => setSelected(new Set());

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  const displayQuery = competitorQuery.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || competitorQuery;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div
          key="channel-picker-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg bg-white rounded-[28px] shadow-[0_24px_64px_rgba(31,38,135,0.12)] border border-white/80 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="channel-picker-title"
          >
          {/* Header */}
          <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="channel-picker-title" className="font-serif text-[24px] sm:text-[28px] text-[#343434] tracking-tight">
                  Where should we look?
                </h2>
                <p className="mt-1.5 text-[14px] sm:text-[15px] text-[#808080] font-medium">
                  Pick the platforms you want to track
                </p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-[#343434] transition-colors"
                aria-label="Close"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Competitor badge */}
            <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-[#DDF1FD]/50 border border-[#DDF1FD]">
              <span className="text-[14px] font-semibold text-[#343434] truncate max-w-[240px]">{displayQuery}</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="px-6 sm:px-8 py-3 flex gap-2">
            <button
              onClick={selectAll}
              className="text-[13px] font-medium text-[#808080] hover:text-[#343434] transition-colors"
            >
              Select all
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={selectNone}
              className="text-[13px] font-medium text-[#808080] hover:text-[#343434] transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Channel grid */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="grid grid-cols-2 gap-3">
              {CHANNELS.map((channel) => {
                const isSelected = selected.has(channel.id);
                return (
                  <button
                    key={channel.id}
                    onClick={() => toggle(channel.id)}
                    className={`
                      flex items-center gap-4 p-4 rounded-[20px] border-2 transition-all duration-200
                      text-left
                      ${isSelected
                        ? "bg-white border-[#343434] shadow-[0_4px_16px_rgba(52,52,52,0.08)]"
                        : "bg-gray-50/80 border-transparent hover:bg-gray-100/80 hover:border-gray-200"
                      }
                    `}
                  >
                    <div
                      className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 ring-1 transition-colors ${
                        isSelected ? "bg-white ring-[#343434]/20" : "bg-white ring-gray-200"
                      }`}
                    >
                      {channel.Logo ? (
                        <channel.Logo className="w-6 h-6" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-gray-200" />
                      )}
                    </div>
                    <span
                      className={`flex-1 font-semibold text-[14px] min-w-0 whitespace-normal break-words ${
                        isSelected ? "text-[#343434]" : "text-gray-600"
                      }`}
                    >
                      {channel.name}
                    </span>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? "bg-[#343434] text-white" : "bg-gray-200 text-transparent"
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="mt-6 w-full h-[52px] rounded-[24px] bg-[#343434] text-white font-semibold text-[16px] shadow-lg hover:bg-[#2a2a2a] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
