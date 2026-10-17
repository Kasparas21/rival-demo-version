"use client";

import Link from "next/link";
import { Headset, RefreshCcw, ShieldCheck } from "lucide-react";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import { RivalLogoImg } from "@/components/rival-logo";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";
import { SiteFooter } from "./editorial-landing";
import { MotionPage, Reveal } from "./editorial-motion";
import { PricingPlans } from "./editorial-pricing";
import { GetStarted, RatingPill, Reviews } from "./landing-closing";
import { Outperform, Proactive } from "./landing-proactive";
import { AdsStats, ChannelCards, HowItWorksLoop } from "./landing-showcase";
import { ScrollStory } from "./landing-story";
import { PromoOffer } from "./promo-offer";
import { WinnerInOneMinute } from "./landing-winner";
import shared from "./editorial-landing.module.css";
import styles from "./pricing-page.module.css";

const FLOATERS = [MetaLogo, GoogleLogo, TikTokLogo, LinkedInLogo, PinterestLogo, SnapchatLogo];
const TRUST_ICONS = [Headset, ShieldCheck, RefreshCcw];

/** A plain white bar with the logo and a Plan → Sign up → Launch stepper, like Holo's checkout. */
function PricingHeader({ copy, steps }: { copy: LandingCopy["header"]; steps: [string, string, string] }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" aria-label={copy.homeAria} className={styles.logo}>
          <RivalLogoImg />
        </Link>
        <ol className={styles.stepper}>
          {steps.map((step, index) => (
            <li key={step} aria-current={index === 0 ? "step" : undefined}>
              <span className={styles.stepDot}>{index + 1}</span>
              <span className={styles.stepName}>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </header>
  );
}

/**
 * /pricing: the one plan front and centre with three reassurances under it, then reviews and
 * the landing's big sections in a different order, ending on a sign-up prompt.
 */
export function PricingPage({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  const show = copy.showcase;
  const page = show.pricingPage;
  return (
    <MotionPage intro={false}>
      <a className={shared.skipLink} href="#main-content">
        Skip to content
      </a>
      <PricingHeader copy={copy.header} steps={page.steps} />
      <PromoOffer locale={locale} bar="ticker" autoPopup={false} sticky stickyHref="/signup" />
      <main id="main-content">
        <section className={styles.hero}>
          <span className={styles.floaters} aria-hidden="true">
            {FLOATERS.map((Logo, index) => (
              <span key={index} className={styles.floater} data-i={index} data-motion-loop>
                <Logo className={styles.floaterLogo} />
              </span>
            ))}
          </span>
          <Reveal amount={0} delay={60}>
            <RatingPill copy={copy.reviews} />
          </Reveal>
          <Reveal amount={0} delay={160}>
            <h1 className={styles.title}>{page.title}</h1>
          </Reveal>
          <Reveal amount={0} delay={260}>
            <p className={styles.sub}>{page.sub}</p>
          </Reveal>
        </section>

        <Reveal amount={0} delay={360} className={styles.plan}>
          <PricingPlans copy={copy.pricing} />
        </Reveal>

        <div className={styles.trust}>
          {page.trust.map((label, index) => {
            const Icon = TRUST_ICONS[index];
            return (
              <Reveal key={label} className={styles.trustItem} delay={100 + index * 120} amount={0.6}>
                <span className={styles.trustIcon}>
                  <Icon size={26} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className={styles.trustLabel}>{label}</span>
              </Reveal>
            );
          })}
        </div>

        <Reviews copy={copy.reviews} title={show.reviews.title} />

        <AdsStats copy={show} />
        <WinnerInOneMinute copy={show} ctaHref="/signup" />
        <Proactive copy={show} ctaHref="/signup" />
        <HowItWorksLoop copy={show} />
        <ChannelCards copy={show} />
        <Outperform copy={show} />
        <ScrollStory copy={show} />

        <GetStarted copy={show} href="/signup" />
      </main>
      <SiteFooter copy={copy} />
    </MotionPage>
  );
}
