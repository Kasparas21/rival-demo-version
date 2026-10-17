"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Bookmark,
  CalendarDays,
  ChevronRight,
  GitCompare,
  Heart,
  Inbox,
  LayoutGrid,
  Layers,
  ListOrdered,
  MessageCircle,
  Play,
  Search,
  Send,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { MarketingFeaturePreview } from "@/components/marketing/marketing-feature-preview";
import { FEATURE_DEFINITIONS, type FeatureDefinition } from "@/components/marketing/features-page-data";
import type { LandingShowcaseCopy } from "@/lib/i18n/landing/showcase";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { Locale } from "@/lib/i18n/locale";
import { ADSPY_PAGE_DEFINITIONS, type AdspyPageDefinition } from "@/lib/marketing/adspy-pages";
import { ADSPY_VISUALS, FEATURE_VISUALS } from "@/lib/marketing/page-visuals";
import { BulletVisual, PlatformMark, type BulletVisualSpec, type LogoKey } from "./bullet-visuals";
import { SiteFooter } from "./editorial-landing";
import { MotionPage, Reveal } from "./editorial-motion";
import { useTilt } from "./editorial-tilt";
import { GlowCta } from "./glow-cta";
import { GetStarted, Reviews } from "./landing-closing";
import { Outperform, Proactive } from "./landing-proactive";
import { AdsStats, HowItWorksLoop } from "./landing-showcase";
import { ScrollStory } from "./landing-story";
import { WinnerInOneMinute } from "./landing-winner";
import { NAV_ART, NavArtTile, SiteHeader } from "./site-header";
import shared from "./editorial-landing.module.css";
import styles from "./marketing-pages.module.css";

type Detail = LandingShowcaseCopy["detail"];

const TONES = ["sky", "pink", "butter", "lilac"] as const;
const KIND_ICONS: Record<BulletVisualSpec["kind"], LucideIcon> = {
  chips: SlidersHorizontal,
  lifespan: Timer,
  source: ArrowRight,
  grid: LayoutGrid,
  summary: Sparkles,
  bars: BarChart3,
  versus: GitCompare,
  save: Bookmark,
  sorted: ListOrdered,
  score: BarChart3,
  tags: Tags,
  calendar: CalendarDays,
  columns: BarChart3,
  classify: Layers,
  alerts: BellRing,
  inbox: Inbox,
  formats: Shapes,
  search: Search,
  checklist: BadgeCheck,
};

/** The page frame every feature and AdSpy page shares: header, main, footer. */
function DetailFrame({ copy, locale, children }: { copy: LandingCopy; locale: Locale; children: ReactNode }) {
  return (
    <MotionPage intro={false}>
      <a className={shared.skipLink} href="#main-content">
        Skip to content
      </a>
      <SiteHeader copy={copy.header} locale={locale} />
      <main id="main-content">{children}</main>
      <SiteFooter copy={copy} />
    </MotionPage>
  );
}

/** Big tilted cards, one per bullet, each with its own little illustration. */
function BulletCards({ bullets, visuals }: { bullets: string[]; visuals: BulletVisualSpec[] }) {
  return (
    <section className={styles.bullets} data-count={bullets.length}>
      <div className={styles.bulletRow}>
        {bullets.map((bullet, index) => {
          const spec = visuals[index];
          const Icon = spec ? KIND_ICONS[spec.kind] : Sparkles;
          return (
            <Reveal key={bullet} className={styles.bulletCell} delay={120 + index * 110} amount={0.2}>
              <article className={styles.bulletCard} data-i={index}>
                <span className={styles.bulletIcon} data-tone={TONES[index % TONES.length]} aria-hidden="true">
                  <Icon size={24} strokeWidth={2.2} />
                </span>
                <h3 className={styles.bulletTitle}>{bullet}</h3>
                <div className={styles.bulletVisual} aria-hidden="true">
                  {spec && <BulletVisual spec={spec} />}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/** A row of colourful icon tiles linking to the sibling pages. */
function MoreTiles({ title, items }: { title: string; items: Array<{ key: string; label: string; href: string }> }) {
  return (
    <section className={styles.more}>
      <Reveal amount={0.4}>
        <h2 className={styles.moreTitle}>{title}</h2>
      </Reveal>
      <div className={styles.moreGrid}>
        {items.map((item, index) => (
          <Reveal key={item.href} className={styles.moreCell} delay={80 + index * 50} amount={0.3}>
            <Link href={item.href} className={styles.moreTile} style={{ "--c": NAV_ART[item.key]?.color } as CSSProperties}>
              <NavArtTile artKey={item.key} />
              <span>{item.label}</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Crumbs({ parent, parentHref, artKey, label }: { parent: string; parentHref: string; artKey: string; label: string }) {
  return (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      <Link href={parentHref}>{parent}</Link>
      <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />
      <span className={styles.crumbHere} aria-current="page">
        <NavArtTile artKey={artKey} size="sm" />
        {label}
      </span>
    </nav>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Feature pages                                                                                */
/* ------------------------------------------------------------------------------------------ */

function FeatureHero({ feature, detail, tryNow }: { feature: FeatureDefinition; detail: Detail; tryNow: string }) {
  const spotRef = useRef<HTMLSpanElement>(null);
  const { onPointerMove, onPointerLeave } = useTilt(spotRef, 0.25);
  const art = NAV_ART[feature.id];
  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <Reveal amount={0} delay={60}>
          <Crumbs parent={detail.features} parentHref="/features" artKey={feature.id} label={art?.short ?? feature.name} />
        </Reveal>
        <Reveal amount={0} delay={140}>
          <h1 className={styles.title}>{feature.name}</h1>
        </Reveal>
        <Reveal amount={0} delay={220}>
          <p className={styles.lead}>{feature.summary}</p>
        </Reveal>
        <Reveal amount={0} delay={300}>
          <p className={styles.why}>
            <Sparkles size={16} strokeWidth={2.4} aria-hidden="true" />
            {feature.why}
          </p>
        </Reveal>
        <Reveal amount={0} delay={380}>
          <div className={styles.actions}>
            <GlowCta href="/pricing" size="lg">
              {tryNow}
            </GlowCta>
            <Link href="/features" className={styles.ghost}>
              {detail.allFeatures}
              <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </div>
      <Reveal amount={0} delay={220} direction="right" className={styles.heroVisual}>
        <span className={styles.heroGlow} style={{ "--c": art?.color ?? "#9ad1ff" } as CSSProperties} aria-hidden="true" />
        <div className={styles.window} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <span className={styles.windowBar}>
            <i />
            <i />
            <i />
            <span className={styles.windowAddress}>rival.app/{feature.id}</span>
            <span className={styles.windowLive}>
              <i />
              {detail.previewLabel}
            </span>
          </span>
          <div className={styles.windowBody}>
            <MarketingFeaturePreview featureId={feature.id} />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function FeatureDetail({ copy, locale, featureId }: { copy: LandingCopy; locale: Locale; featureId: string }) {
  const show = copy.showcase;
  const feature = FEATURE_DEFINITIONS.find((item) => item.id === featureId) ?? FEATURE_DEFINITIONS[0];
  const others = FEATURE_DEFINITIONS.filter((item) => item.id !== feature.id).map((item) => ({
    key: item.id,
    label: NAV_ART[item.id]?.short ?? item.name,
    href: `/features/${item.id}`,
  }));
  return (
    <DetailFrame copy={copy} locale={locale}>
      <FeatureHero feature={feature} detail={show.detail} tryNow={copy.header.tryNow} />
      <BulletCards bullets={feature.bullets} visuals={FEATURE_VISUALS[feature.id] ?? []} />
      <HowItWorksLoop copy={show} />
      <WinnerInOneMinute copy={show} />
      <AdsStats copy={show} />
      <Proactive copy={show} />
      <Outperform copy={show} />
      <ScrollStory copy={show} />
      <MoreTiles title={show.detail.moreFeatures} items={others} />
      <Reviews copy={copy.reviews} title={show.reviews.title} />
      <GetStarted copy={show} href="/pricing" />
    </DetailFrame>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* AdSpy pages                                                                                  */
/* ------------------------------------------------------------------------------------------ */

const SLUG_LOGO: Record<string, LogoKey> = {
  meta: "meta",
  google: "google",
  tiktok: "tiktok",
  linkedin: "linkedin",
  pinterest: "pinterest",
  snapchat: "snapchat",
};

/** A platform-flavoured stack of example ads for the AdSpy hero. */
function AdspyHeroVisual({ slug }: { slug: string }) {
  const logo = SLUG_LOGO[slug] ?? "meta";
  const badge = (
    <span className={styles.liveChip}>
      <i />
      Live
    </span>
  );
  if (slug === "google") {
    return (
      <div className={styles.adStage} data-platform={slug}>
        <div className={styles.serp}>
          <span className={styles.serpQuery}>
            <Search size={15} strokeWidth={2.4} />
            running shoes free returns
          </span>
          {[0, 1].map((i) => (
            <span key={i} className={styles.serpAd} data-i={i}>
              <em>Sponsored · {i === 0 ? "northwind.com" : "peakgear.com"}</em>
              <b>{i === 0 ? "Running Shoes With Free Returns, Forever" : "Built For The Last Mile. Shop Trail"}</b>
              <i />
              <i data-short />
            </span>
          ))}
        </div>
        <div className={styles.banner}>
          <b>Summer sale</b>
          <span>Up to 40% off</span>
          <em>Shop now</em>
        </div>
        <div className={styles.youtube}>
          <Image src="/landing/ads/adidas-outlet.webp" alt="" fill sizes="260px" />
          <span className={styles.ytPlay}>
            <Play size={16} fill="currentColor" strokeWidth={0} />
          </span>
        </div>
        <span className={styles.floatChip} data-pos="a">
          <PlatformMark logo="google" className={styles.chipLogo} />
          Search · Display · YouTube
        </span>
      </div>
    );
  }
  if (slug === "linkedin") {
    return (
      <div className={styles.adStage} data-platform={slug}>
        <div className={styles.post}>
          <span className={styles.postHead}>
            <span className={styles.postAvatar}>P</span>
            <span>
              <b>Peak Analytics</b>
              <small>Promoted</small>
            </span>
            <PlatformMark logo="linkedin" className={styles.chipLogo} />
          </span>
          <span className={styles.postText}>
            Teams cut reporting time by 40% with one dashboard. See how in a 20-minute demo.
          </span>
          <span className={styles.postImage}>
            <span className={styles.postChart}>
              {[38, 52, 46, 70, 64, 88].map((h, i) => (
                <i key={i} style={{ "--h": `${h}%` } as CSSProperties} />
              ))}
            </span>
          </span>
          <span className={styles.postFoot}>
            <span>peakanalytics.io</span>
            <em>Book a demo</em>
          </span>
        </div>
        <span className={styles.floatChip} data-pos="a">
          <Sparkles size={13} strokeWidth={2.4} />
          Lead-gen form
        </span>
        <span className={styles.floatChip} data-pos="b">
          {badge}
          34 sponsored posts
        </span>
      </div>
    );
  }
  if (slug === "pinterest") {
    const pins = [
      "/landing/ads/adidas-adilette.webp",
      "/landing/ads/nike-sneaker.webp",
      "/landing/ads/gymshark-essentials.webp",
      "/landing/ads/nike-sale.webp",
      "/landing/ads/gymshark-training.webp",
    ];
    return (
      <div className={styles.adStage} data-platform={slug}>
        <div className={styles.pins}>
          {pins.map((src, i) => (
            <span key={src} className={styles.pin} data-i={i}>
              <Image src={src} alt="" fill sizes="180px" />
              {i === 1 && <em>Save</em>}
            </span>
          ))}
        </div>
        <span className={styles.floatChip} data-pos="a">
          <PlatformMark logo="pinterest" className={styles.chipLogo} />
          Promoted pins
        </span>
      </div>
    );
  }
  if (slug === "tiktok" || slug === "snapchat") {
    const image = slug === "tiktok" ? "/landing/ads/gymshark-training.webp" : "/landing/ads/nike-sale.webp";
    return (
      <div className={styles.adStage} data-platform={slug}>
        <div className={styles.phone}>
          <Image src={image} alt="" fill sizes="280px" className={styles.phoneImage} />
          {slug === "snapchat" ? (
            <span className={styles.storyBars}>
              <i data-on />
              <i />
              <i />
            </span>
          ) : (
            <span className={styles.sideIcons}>
              <i>
                <Heart size={18} fill="currentColor" strokeWidth={0} />
              </i>
              <i>
                <MessageCircle size={18} fill="currentColor" strokeWidth={0} />
              </i>
              <i>
                <Send size={17} fill="currentColor" strokeWidth={0} />
              </i>
            </span>
          )}
          <span className={styles.phoneCaption}>
            <b>Sponsored</b>
            <i />
            <i data-short />
          </span>
          <span className={styles.phoneCta}>{slug === "tiktok" ? "Shop now" : "Swipe up"}</span>
        </div>
        <span className={styles.floatChip} data-pos="a">
          <PlatformMark logo={logo} className={styles.chipLogo} />
          {slug === "tiktok" ? "Spark ad" : "Story ad"}
        </span>
        <span className={styles.floatChip} data-pos="b">
          {badge}
          Tracked daily
        </span>
      </div>
    );
  }
  const cards = ["/landing/ads/nike-sale.webp", "/landing/ads/gymshark-training.webp", "/landing/ads/adidas-outlet.webp"];
  return (
    <div className={styles.adStage} data-platform={slug}>
      {cards.map((src, i) => (
        <div key={src} className={styles.feedCard} data-i={i}>
          <span className={styles.feedHead}>
            <PlatformMark logo={logo} className={styles.chipLogo} />
            <b>Sponsored</b>
            {i === 1 && badge}
          </span>
          <span className={styles.feedImage}>
            <Image src={src} alt="" fill sizes="260px" />
          </span>
          <span className={styles.feedFoot}>
            <i />
            <em>Shop now</em>
          </span>
        </div>
      ))}
      <span className={styles.floatChip} data-pos="a">
        <PlatformMark logo={logo} className={styles.chipLogo} />
        Facebook · Instagram
      </span>
    </div>
  );
}

function AdspyHero({ page, detail, tryNow }: { page: AdspyPageDefinition; detail: Detail; tryNow: string }) {
  const [main, ...rest] = page.headline.split(", ");
  const tail = rest.join(", ");
  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <Reveal amount={0} delay={60}>
          <Crumbs parent={detail.adspy} parentHref="/adspy/meta" artKey={page.slug} label={page.name} />
        </Reveal>
        <Reveal amount={0} delay={140}>
          <h1 className={styles.title}>
            {main}
            {tail && <span className={styles.titleMuted}>{tail}</span>}
          </h1>
        </Reveal>
        <Reveal amount={0} delay={220}>
          <p className={styles.lead}>{page.summary}</p>
        </Reveal>
        <Reveal amount={0} delay={300}>
          <p className={styles.why}>
            <Sparkles size={16} strokeWidth={2.4} aria-hidden="true" />
            {page.why}
          </p>
        </Reveal>
        <Reveal amount={0} delay={380}>
          <div className={styles.actions}>
            <GlowCta href="/pricing" size="lg">
              {tryNow}
            </GlowCta>
          </div>
        </Reveal>
      </div>
      <Reveal amount={0} delay={220} direction="right" className={styles.heroVisual}>
        <span className={styles.heroGlow} style={{ "--c": NAV_ART[page.slug]?.color ?? "#9ad1ff" } as CSSProperties} aria-hidden="true" />
        <AdspyHeroVisual slug={page.slug} />
      </Reveal>
    </section>
  );
}

export function AdspyDetail({ copy, locale, slug }: { copy: LandingCopy; locale: Locale; slug: string }) {
  const show = copy.showcase;
  const page = ADSPY_PAGE_DEFINITIONS.find((item) => item.slug === slug) ?? ADSPY_PAGE_DEFINITIONS[0];
  const others = ADSPY_PAGE_DEFINITIONS.filter((item) => item.slug !== page.slug).map((item) => ({
    key: item.slug,
    label: item.name,
    href: `/adspy/${item.slug}`,
  }));
  return (
    <DetailFrame copy={copy} locale={locale}>
      <AdspyHero page={page} detail={show.detail} tryNow={copy.header.tryNow} />
      <BulletCards bullets={page.bullets} visuals={ADSPY_VISUALS[page.slug] ?? []} />
      <AdsStats copy={show} />
      <WinnerInOneMinute copy={show} />
      <HowItWorksLoop copy={show} />
      <Proactive copy={show} />
      <Outperform copy={show} />
      <ScrollStory copy={show} />
      <MoreTiles title={show.detail.morePlatforms} items={others} />
      <Reviews copy={copy.reviews} title={show.reviews.title} />
      <GetStarted copy={show} href="/pricing" />
    </DetailFrame>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* /features overview                                                                           */
/* ------------------------------------------------------------------------------------------ */

export function FeaturesOverview({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  const show = copy.showcase;
  const detail = show.detail;
  return (
    <DetailFrame copy={copy} locale={locale}>
      <section className={styles.overviewHero}>
        <Reveal amount={0} delay={60}>
          <h1 className={styles.overviewTitle}>
            {detail.overviewTitle}
            <span>{detail.overviewTitleMuted}</span>
          </h1>
        </Reveal>
        <Reveal amount={0} delay={160}>
          <p className={styles.overviewSub}>{detail.overviewSub}</p>
        </Reveal>
        <Reveal amount={0} delay={240}>
          <GlowCta href="/pricing" size="lg">
            {copy.header.tryNow}
          </GlowCta>
        </Reveal>
      </section>
      <section className={styles.featureGrid}>
        {FEATURE_DEFINITIONS.map((feature, index) => (
          <Reveal key={feature.id} className={styles.featureCell} delay={80 + (index % 4) * 90} amount={0.2}>
            <Link
              href={`/features/${feature.id}`}
              className={styles.featureCard}
              style={{ "--c": NAV_ART[feature.id]?.color ?? "#9ad1ff" } as CSSProperties}
            >
              <NavArtTile artKey={feature.id} size="lg" />
              <h2>{feature.name}</h2>
              <p>{feature.summary}</p>
              <span className={styles.featureLink}>
                {detail.explore}
                <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
              </span>
            </Link>
          </Reveal>
        ))}
      </section>
      <HowItWorksLoop copy={show} />
      <WinnerInOneMinute copy={show} />
      <Proactive copy={show} />
      <Outperform copy={show} />
      <Reviews copy={copy.reviews} title={show.reviews.title} />
      <GetStarted copy={show} href="/pricing" />
    </DetailFrame>
  );
}
