"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { MetaLogo } from "@/components/platform-logos";
import { MetaAdCard } from "@/components/ads-library/meta-ad-card";
import { META_ADS_MODAL_PAGE_SIZE } from "@/lib/ad-library/constants";
import type { MetaAdCard as MetaAdCardModel } from "@/lib/ad-library/normalize";

export interface MetaAdsAllModalProps {
  open: boolean;
  onClose: () => void;
  ads: MetaAdCardModel[];
  viewMode: "grid" | "list";
  brand: { domain: string; logoUrl: string };
}

export function MetaAdsAllModal({ open, onClose, ads, viewMode, brand }: MetaAdsAllModalProps) {
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setPage(0);
    }
  }, [open]);

  useEffect(() => {
    const total = ads.length;
    const pageCount = Math.max(1, Math.ceil(total / META_ADS_MODAL_PAGE_SIZE));
    setPage((p) => Math.min(p, Math.max(0, pageCount - 1)));
  }, [ads.length]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const total = ads.length;
  const pageCount = Math.max(1, Math.ceil(total / META_ADS_MODAL_PAGE_SIZE));
  const start = total === 0 ? 0 : page * META_ADS_MODAL_PAGE_SIZE + 1;
  const end = Math.min(total, (page + 1) * META_ADS_MODAL_PAGE_SIZE);
  const pageAds = ads.slice(page * META_ADS_MODAL_PAGE_SIZE, (page + 1) * META_ADS_MODAL_PAGE_SIZE);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          key="meta-ads-all-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_24px_64px_rgba(31,38,135,0.12)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="meta-ads-all-title"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
                  <MetaLogo className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 id="meta-ads-all-title" className="text-[18px] font-semibold text-[#343434] sm:text-[20px]">
                    Meta / Facebook ads
                  </h2>
                  <p className="mt-0.5 text-[13px] text-[#6b7280]">
                    {total === 0 ? "No ads to show" : `Showing ${start}–${end} of ${total}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#343434]"
                aria-label="Close"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {pageAds.length === 0 ? (
                <p className="py-8 text-center text-[14px] text-[#6b7280]">No ads match the current filters.</p>
              ) : (
                <div
                  className={`grid items-stretch gap-6 ${viewMode === "list" ? "mx-auto w-full max-w-2xl grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
                >
                  {pageAds.map((ad) => (
                    <div key={ad.id} className="h-full min-h-0 flex flex-col">
                      <MetaAdCard ad={ad} viewMode={viewMode} brand={brand} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:px-6">
              <p className="text-[13px] text-[#6b7280]">
                Page {page + 1} of {pageCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[13px] font-medium text-[#343434] transition-colors hover:bg-[#f9fafb] disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[13px] font-medium text-[#343434] transition-colors hover:bg-[#f9fafb] disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
