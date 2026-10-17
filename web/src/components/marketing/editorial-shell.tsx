import type { ComponentProps, ReactNode } from "react";
import { Source_Serif_4 } from "next/font/google";

import { LandingContactProvider } from "@/components/landing/landing-contact-provider";
import { PromoOffer } from "@/components/landing/promo-offer";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";
import {
  getLandingContactCta,
  getLandingContactHref,
} from "@/lib/landing/landing-contact-config";

const editorialSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: "500",
  style: "italic",
  variable: "--font-editorial-serif",
  display: "swap",
});

type PromoOptions = Omit<ComponentProps<typeof PromoOffer>, "locale">;

/**
 * What every editorial marketing page shares: the contact modal, the offer bar with its
 * bottom pill and scratch card, and the serif used for the italic accents.
 */
export function EditorialShell({
  copy,
  locale,
  promo,
  children,
}: {
  copy: LandingCopy;
  locale: Locale;
  /** Options for the offer pill and popup; `false` when the page places its own PromoOffer. */
  promo?: PromoOptions | false;
  children: ReactNode;
}) {
  return (
    <LandingContactProvider
      contactHref={getLandingContactHref(copy)}
      contactCta={getLandingContactCta(copy)}
      modalCopy={copy.pricing.contactModal}
    >
      {promo !== false && <PromoOffer locale={locale} {...promo} />}
      <div className={editorialSerif.variable}>{children}</div>
    </LandingContactProvider>
  );
}
