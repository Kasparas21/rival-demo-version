"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { LandingContactModal } from "@/components/landing/landing-contact-modal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import type { LandingCopy } from "@/lib/i18n/landing/types";

type ContactModalCopy = LandingCopy["pricing"]["contactModal"];

type LandingContactContextValue = {
  openContact: () => void;
  contactCta: string;
};

const LandingContactContext = createContext<LandingContactContextValue | null>(null);

export function useLandingContact(): LandingContactContextValue {
  const context = useContext(LandingContactContext);
  if (!context) {
    throw new Error("useLandingContact must be used within LandingContactProvider");
  }
  return context;
}

type LandingContactProviderProps = {
  children: ReactNode;
  contactHref: string;
  contactCta: string;
  modalCopy: ContactModalCopy;
};

export function LandingContactProvider({
  children,
  contactHref,
  contactCta,
  modalCopy,
}: LandingContactProviderProps) {
  const [open, setOpen] = useState(false);
  const openContact = useCallback(() => setOpen(true), []);
  const closeContact = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({
      openContact,
      contactCta,
    }),
    [openContact, contactCta],
  );

  return (
    <LandingContactContext.Provider value={value}>
      {children}
      <LandingContactModal
        open={open}
        onClose={closeContact}
        contactHref={contactHref}
        copy={modalCopy}
      />
    </LandingContactContext.Provider>
  );
}

type LandingContactCtaProps = Omit<
  ComponentProps<typeof LandingTrialCta>,
  "href" | "onClick" | "children"
> & {
  children?: ComponentProps<typeof LandingTrialCta>["children"];
  trailingArrow?: boolean;
};

/** Landing CTA that opens the shared contact modal with a unified label. */
export function LandingContactCta({
  children,
  trailingArrow = false,
  ...props
}: LandingContactCtaProps) {
  const { openContact, contactCta } = useLandingContact();

  return (
    <LandingTrialCta {...props} onClick={openContact}>
      {children ?? contactCta}
      {trailingArrow ? <span aria-hidden>→</span> : null}
    </LandingTrialCta>
  );
}
