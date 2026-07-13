"use client";

import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { OnboardingFlowHeader } from "@/components/onboarding/onboarding-flow-header";
import { AppleMailLogo, GmailLogo, OutlookLogo } from "@/components/landing/email-client-logos";
import { glassPanelClass } from "@/components/ui/glass-styles";
import {
  buildContactEmailUrl,
  parseMailtoHref,
  type ContactEmailClient,
} from "@/lib/landing/contact-email-urls";
import type { LandingCopy } from "@/lib/i18n/landing/types";

type Props = {
  open: boolean;
  onClose: () => void;
  contactHref: string;
  copy: LandingCopy["pricing"]["contactModal"];
};

const EMAIL_CLIENTS: Array<{
  id: ContactEmailClient;
  labelKey: "gmail" | "appleMail" | "outlook";
  Logo: ComponentType<{ className?: string }>;
}> = [
  { id: "gmail", labelKey: "gmail", Logo: GmailLogo },
  { id: "apple", labelKey: "appleMail", Logo: AppleMailLogo },
  { id: "outlook", labelKey: "outlook", Logo: OutlookLogo },
];

export function LandingContactModal({ open, onClose, contactHref, copy }: Props) {
  const [mounted, setMounted] = useState(false);
  const { email, subject } = parseMailtoHref(contactHref);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          key="landing-contact-overlay"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          role="presentation"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-[#4a7fa5]/22 backdrop-blur-2xl backdrop-saturate-[1.5]"
            aria-label={copy.closeAria}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative z-10 flex w-full max-w-md flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <OnboardingFlowHeader className="mb-6 sm:mb-7" />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="landing-contact-title"
              className={`relative w-full ${glassPanelClass}`}
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-full border border-white/70 bg-white/60 text-gray-600 shadow-sm backdrop-blur-md transition hover:bg-white/80 hover:text-gray-900"
                aria-label={copy.closeAria}
              >
                <X className="size-4" strokeWidth={2.25} />
              </button>

              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  {copy.emailLabel}
                </p>
                <div className="mt-3 flex justify-center">
                  <p className="inline-flex min-h-[3.25rem] w-full max-w-full items-center justify-center rounded-full border border-white/75 bg-white/92 px-5 py-3 text-center text-[15px] font-bold tracking-tight text-[#1a1a1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_8px_24px_-10px_rgba(74,127,165,0.18)] select-all">
                    {email}
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <h2
                  id="landing-contact-title"
                  className="text-[22px] font-semibold tracking-tight text-gray-900"
                >
                  {copy.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{copy.subtitle}</p>
              </div>

              <div className="mt-6 space-y-2.5">
                {EMAIL_CLIENTS.map(({ id, labelKey, Logo }) => (
                  <a
                    key={id}
                    href={buildContactEmailUrl(id, email, subject)}
                    target={id === "apple" ? undefined : "_blank"}
                    rel={id === "apple" ? undefined : "noopener noreferrer"}
                    className="group flex items-center gap-3.5 rounded-2xl border border-white/60 bg-white/35 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] backdrop-blur transition hover:border-white/75 hover:bg-white/50 hover:shadow-[0_8px_28px_rgba(31,38,135,0.08)]"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/[0.04]">
                      <Logo className="size-7" />
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] font-semibold text-gray-900">
                      {copy[labelKey]}
                    </span>
                    <span
                      aria-hidden
                      className="text-sm font-semibold text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-600"
                    >
                      →
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
