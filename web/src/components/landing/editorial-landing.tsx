"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RivalLogoImg } from "@/components/rival-logo";
import {
  GoogleLogo,
  InstagramLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";
import { HeroWords, MotionPage, Reveal } from "./editorial-motion";
import { GlowCta } from "./glow-cta";
import { HeroAdCarousel } from "./hero-ad-carousel";
import { GetStarted, RatingPill, Reviews } from "./landing-closing";
import { Outperform, Proactive } from "./landing-proactive";
import { AdsStats, ChannelCards, HowItWorksLoop } from "./landing-showcase";
import { ScrollStory } from "./landing-story";
import { WinnerInOneMinute } from "./landing-winner";
import { SiteHeader } from "./site-header";
import styles from "./editorial-landing.module.css";

const platforms = [
  { name: "Meta", Logo: MetaLogo },
  { name: "Google", Logo: GoogleLogo },
  { name: "TikTok", Logo: TikTokLogo },
  { name: "Instagram", Logo: InstagramLogo },
  { name: "LinkedIn", Logo: LinkedInLogo },
  { name: "Pinterest", Logo: PinterestLogo },
];

function PlatformStrip() {
  return (
    <div
      className={styles.platformStrip}
      aria-label="Meta, Google, TikTok, Instagram, LinkedIn and Pinterest"
    >
      <div className={styles.platformTrack} data-ticker-speed="10">
        {[0, 1].map((set) => (
          <div key={set} className={styles.platformSet} aria-hidden="true">
            {platforms.map(({ name, Logo }) => (
              <span key={name} title={name}>
                <Logo className={styles.platformLogo} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The marketing pages' footer: brand line, link columns and the small print. */
export function SiteFooter({ copy }: { copy: LandingCopy }) {
  return (
    <footer className={`${styles.container} ${styles.footer}`} id="affiliates">
      <Reveal className={styles.footerTop} amount={0} delay={200}>
        <div className={styles.footerBrand}>
          <Link href="/" aria-label={copy.header.homeAria}>
            <RivalLogoImg />
          </Link>
          <p>
            Rival watches your competitors
            <br />
            <em>so you don&apos;t have to.</em>
          </p>
          <a href="mailto:hello@spy-rival.com">
            hello@spy-rival.com <ArrowUpRight size={14} />
          </a>
        </div>
        <div className={styles.footerColumns}>
          {copy.footer.columns.map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>
      <div className={styles.footerBottom}>
        <span>{copy.footer.copyright}</span>
        <a href="#main-content">
          Back to top <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}

/**
 * The home page: hero, then the big visual sections on the same sky background (channels, how
 * it works, the ad wall, proactive alerts, the outperform chart and the pinned scroll story),
 * reviews and a last call to action. Pricing lives on /pricing.
 */
export function EditorialLanding({
  copy,
  locale,
}: {
  copy: LandingCopy;
  locale: Locale;
}) {
  const show = copy.showcase;
  return (
    <MotionPage>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <SiteHeader copy={copy.header} locale={locale} />
      <main id="main-content">
        <section
          className={`${styles.hero} ${styles.container}`}
          aria-labelledby="landing-title"
        >
          <div className={styles.heroContent}>
            <div className={styles.heroRating} data-hero-enter="1.9">
              <RatingPill copy={copy.reviews} />
            </div>
            <div className={styles.heroKicker} data-hero-enter="2">
              <PlatformStrip />
              <span>Ads, posts, emails and pages in one place</span>
            </div>
            <h1 id="landing-title" data-hero-enter="2.1">
              <HeroWords>{copy.hero.headline.line1Prefix.trim()}</HeroWords>
              <br />
              <em>
                <HeroWords>{copy.hero.headline.highlight}</HeroWords>
              </em>
              {copy.hero.headline.line2 && (
                <span className={styles.heroLine}>
                  <HeroWords>{copy.hero.headline.line2}</HeroWords>
                </span>
              )}
            </h1>
            <p className={styles.heroDescription} data-hero-enter="2.2">
              {copy.hero.headline.subline}
            </p>
            <div className={styles.heroActions} data-hero-enter="2.3">
              <GlowCta href="/pricing" size="lg">
                Get started
              </GlowCta>
            </div>
          </div>
          <div className={styles.heroVisual} data-hero-enter="2.1">
            <HeroAdCarousel />
          </div>
        </section>

        <ChannelCards copy={show} />
        <HowItWorksLoop copy={show} />
        <WinnerInOneMinute copy={show} />
        <AdsStats copy={show} />
        <Proactive copy={show} />
        <Outperform copy={show} />
        <ScrollStory copy={show} />

        <Reviews copy={copy.reviews} title={show.reviews.title} />
        <GetStarted copy={show} href="/pricing" />
      </main>
      <SiteFooter copy={copy} />
    </MotionPage>
  );
}
