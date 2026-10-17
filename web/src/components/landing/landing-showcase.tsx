"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Globe,
  Heart,
  Mail,
  Megaphone,
  Search,
  Sparkles,
} from "lucide-react";
import {
  GoogleLogo,
  InstagramLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import { RivalLogoImg } from "@/components/rival-logo";
import { HiggsfieldMark, SlackLogo } from "./brand-marks";
import type { LandingShowcaseCopy } from "@/lib/i18n/landing/showcase";
import { Reveal } from "./editorial-motion";
import { isScrollingFast, prefersReducedMotion, trackScrollSpeed, useFirstSight } from "./editorial-tilt";
import styles from "./landing-showcase.module.css";

/* ------------------------------------------------------------------------------------------ */
/* 1. Big tilted visual cards: what Rival watches, one channel per card.                       */
/* ------------------------------------------------------------------------------------------ */

function ChannelCard({
  index,
  tone,
  icon,
  title,
  children,
}: {
  index: number;
  tone: "ads" | "organic" | "email" | "pages";
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Reveal className={styles.channelCell} delay={120 + index * 110} amount={0.15}>
      <article className={styles.channelCard} data-i={index}>
        <span className={styles.channelIcon} data-tone={tone} aria-hidden="true">
          {icon}
        </span>
        <h3 className={styles.channelTitle}>{title}</h3>
        <div className={styles.channelVisual} aria-hidden="true">
          {children}
        </div>
      </article>
    </Reveal>
  );
}

/** One example ad per platform, so the card shows at a glance that Rival covers all six. */
const PLATFORM_ADS = [
  { name: "Meta", Logo: MetaLogo, src: "/landing/ads/nike-sale.webp" },
  { name: "Google", Logo: GoogleLogo, src: "/landing/ads/adidas-outlet.webp" },
  { name: "TikTok", Logo: TikTokLogo, src: "/landing/ads/gymshark-training.webp" },
  { name: "LinkedIn", Logo: LinkedInLogo, src: "/landing/ads/nike-sneaker.webp" },
  { name: "Pinterest", Logo: PinterestLogo, src: "/landing/ads/adidas-adilette.webp" },
  { name: "Snapchat", Logo: SnapchatLogo, src: "/landing/ads/gymshark-essentials.webp" },
] as const;

export function ChannelCards({ copy }: { copy: LandingShowcaseCopy }) {
  const c = copy.channels;
  const posts = [
    [{ tone: "pink", label: 0, Logo: InstagramLogo, h: 64 }, { tone: "blue", label: 1, Logo: LinkedInLogo, h: 40 }],
    [{ tone: "lilac", label: 1, Logo: TikTokLogo, h: 88 }],
    [{ tone: "yellow", label: 2, Logo: InstagramLogo, h: 46 }, { tone: "pink", label: 0, Logo: TikTokLogo, h: 56 }],
    [{ tone: "blue", label: 0, Logo: InstagramLogo, h: 104 }],
  ] as const;
  return (
    <section className={styles.channels}>
      <div className={styles.channelRow}>
        <ChannelCard index={0} tone="ads" icon={<Megaphone size={26} strokeWidth={2.2} />} title={c.ads.title}>
          <span className={styles.adCaption}>{c.ads.caption}</span>
          <div className={styles.platformAds}>
            {PLATFORM_ADS.map((ad, i) => (
              <span key={ad.name} className={styles.platformAd} data-i={i}>
                <span className={styles.platformAdImage}>
                  <Image src={ad.src} alt="" fill sizes="90px" />
                </span>
                <span className={styles.platformAdBadge}>
                  <ad.Logo className={styles.platformAdLogo} />
                </span>
                <b>{ad.name}</b>
              </span>
            ))}
          </div>
          <span className={styles.newBadge}>
            <i />
            {c.ads.badge}
          </span>
        </ChannelCard>

        <ChannelCard index={1} tone="organic" icon={<Heart size={26} strokeWidth={2.2} />} title={c.organic.title}>
          <div className={styles.calendar}>
            <p className={styles.calendarHead}>{c.organic.heading}</p>
            <div className={styles.calendarDays}>
              {c.organic.days.map((day, column) => (
                <div key={day} className={styles.calendarDay}>
                  <span>{day}</span>
                  {posts[column].map((post, row) => (
                    <i
                      key={row}
                      data-tone={post.tone}
                      style={{ height: post.h, "--d": column * 2 + row } as CSSProperties}
                    >
                      <post.Logo className={styles.postLogo} />
                      <b>{c.organic.labels[post.label]}</b>
                    </i>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </ChannelCard>

        <ChannelCard index={2} tone="email" icon={<Mail size={26} strokeWidth={2.2} />} title={c.email.title}>
          <div className={styles.inbox}>
            <p className={styles.inboxHead}>{c.email.heading}</p>
            {c.email.rows.map((row, index) => (
              <div key={row.from} className={styles.inboxRow} data-hot={index === 0 || undefined}>
                <span className={styles.avatar} data-i={index}>
                  {row.from.slice(0, 1)}
                </span>
                <span className={styles.inboxText}>
                  <b>{row.from}</b>
                  <span>{row.subject}</span>
                </span>
                <span className={styles.inboxTime}>
                  {index === 0 ? <em>{c.email.promo}</em> : row.time}
                </span>
              </div>
            ))}
          </div>
        </ChannelCard>

        <ChannelCard index={3} tone="pages" icon={<Globe size={26} strokeWidth={2.2} />} title={c.pages.title}>
          <div className={styles.pages}>
            <div className={styles.pageFrame} data-back>
              <span className={styles.pageDots}>
                <i />
                <i />
                <i />
              </span>
              <span className={styles.pageLabel}>{c.pages.before}</span>
              <span className={styles.pageHeadline} />
              <span className={styles.pageLines}>
                <i />
                <i />
              </span>
              <span className={styles.pageCta} data-old>
                {c.pages.cta}
              </span>
            </div>
            <div className={styles.pageFrame} data-front>
              <span className={styles.pageDots}>
                <i />
                <i />
                <i />
              </span>
              <span className={styles.pageLabel}>{c.pages.after}</span>
              <span className={styles.pageHeadline} />
              <span className={styles.pageLines}>
                <i />
                <i />
              </span>
              <span className={styles.pageCta} data-new>
                {c.pages.cta}
                <ArrowRight size={13} strokeWidth={2.6} />
              </span>
              <span className={styles.pageChange}>
                <Sparkles size={12} strokeWidth={2.4} />
                {c.pages.change}
              </span>
            </div>
          </div>
        </ChannelCard>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* 2. How it works: five steps around a glowing Rival orb, joined by arrows.                   */
/* ------------------------------------------------------------------------------------------ */

const TRACK_ICONS = [Megaphone, Globe, Mail, Heart];

export function HowItWorksLoop({ copy }: { copy: LandingShowcaseCopy }) {
  const h = copy.how;
  const s = h.steps;
  const loopRef = useRef<HTMLDivElement>(null);
  useFirstSight(loopRef);
  return (
    <section className={styles.how} id="how-it-works">
      <div className={styles.howHead}>
        <Reveal amount={0.3}>
          <h2 className={styles.howTitle}>
            {h.title}
            <span>{h.titleMuted}</span>
          </h2>
        </Reveal>
        <Reveal amount={0.3} delay={200}>
          <p className={styles.howIntro}>{h.intro}</p>
        </Reveal>
      </div>

      <div ref={loopRef} className={styles.loop}>
        <svg className={styles.arrows} viewBox="0 0 1100 900" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="how-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M1 1 L8 5 L1 9" fill="none" stroke="#365c75" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          <path d="M735 120 C 850 128, 918 170, 938 232" markerEnd="url(#how-arrow)" />
          <path d="M1012 520 C 1052 575, 1018 622, 952 652" markerEnd="url(#how-arrow)" />
          <path d="M612 812 C 580 850, 520 850, 488 816" markerEnd="url(#how-arrow)" />
          <path d="M126 712 C 58 664, 50 578, 116 528" markerEnd="url(#how-arrow)" />
          <path d="M172 236 C 186 162, 268 122, 362 118" markerEnd="url(#how-arrow)" />
        </svg>

        <div className={styles.orb} aria-hidden="true">
          <span className={styles.orbRing} />
          <span className={styles.orbCore}>
            <RivalLogoImg />
          </span>
        </div>

        <div className={styles.step} data-step="1">
          <p className={styles.stepTitle}>{s.add.title}</p>
          <div className={`${styles.stepCard} ${styles.addCard}`}>
            <span className={styles.browserDots}>
              <i />
              <i />
              <i />
            </span>
            <span className={styles.urlField}>
              <Search size={16} strokeWidth={2.2} />
              {s.add.placeholder}
              <i className={styles.caret} />
            </span>
            <span className={styles.logoRow}>
              {PLATFORM_ADS.map(({ name, Logo }) => (
                <Logo key={name} className={styles.tileLogo} />
              ))}
            </span>
          </div>
        </div>

        <div className={styles.step} data-step="2">
          <p className={styles.stepTitle}>{s.track.title}</p>
          <div className={styles.stepCard}>
            {s.track.rows.map((row, i) => {
              const Icon = TRACK_ICONS[i];
              return (
                <span key={row.label} className={styles.trackRow} style={{ "--i": i } as CSSProperties}>
                  <span className={styles.trackIcon} data-i={i}>
                    <Icon size={17} strokeWidth={2.3} />
                  </span>
                  <b>{row.label}</b>
                  <em>{row.note}</em>
                  <span className={styles.trackCheck}>
                    <Check size={13} strokeWidth={3} />
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        <div className={styles.step} data-step="3">
          <p className={styles.stepTitle}>{s.slack.title}</p>
          <div className={styles.stepCard}>
            <span className={styles.slackTop}>
              <SlackLogo className={styles.slackLogo} />
              <b>{s.slack.channel}</b>
              <em>{s.slack.time}</em>
            </span>
            <span className={styles.slackMsg}>
              <span className={styles.rivalAvatar}>
                <Image src="/icon.svg" alt="" width={36} height={36} />
              </span>
              <span className={styles.slackBody}>
                <b>
                  Rival <i>{s.slack.app}</i>
                </b>
                <span>{s.slack.message}</span>
                <span className={styles.slackSource}>
                  <Globe size={12} strokeWidth={2.4} />
                  {s.slack.source}
                </span>
              </span>
            </span>
          </div>
        </div>

        <div className={styles.step} data-step="4">
          <p className={styles.stepTitle}>{s.chat.title}</p>
          <div className={styles.stepCard}>
            <span className={styles.bubble} data-me>
              {s.chat.question}
            </span>
            <span className={styles.bubbleRow}>
              <span className={styles.rivalAvatar}>
                <Image src="/icon.svg" alt="" width={36} height={36} />
              </span>
              <span className={styles.bubble}>{s.chat.answer}</span>
            </span>
          </div>
        </div>

        <div className={styles.step} data-step="5">
          <p className={styles.stepTitle}>{s.copy.title}</p>
          <div className={styles.stepCard}>
            <span className={styles.copyRow}>
              <span className={styles.copyAd}>
                <Image src="/landing/ads/nike-sale.webp" alt="" fill sizes="140px" />
                <em>{s.copy.theirs}</em>
              </span>
              <span className={styles.copyArrow}>
                <ArrowRight size={18} strokeWidth={2.6} />
              </span>
              <span className={styles.copyAd} data-yours>
                <Image src="/landing/ads/nike-sale.webp" alt="" fill sizes="140px" />
                <em>{s.copy.yours}</em>
              </span>
            </span>
            <span className={styles.copyTool}>
              <HiggsfieldMark size={18} />
              {s.copy.tool}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* 3. A sliding wall of competitor ads, then four facts that count up into view.              */
/* ------------------------------------------------------------------------------------------ */

const WALL = [
  { kind: "image", src: "/landing/ads/nike-sale.webp", brand: "Nike", Logo: MetaLogo },
  { kind: "text", brand: "Northwind", tone: "sky", headline: "Summer sale. 30% off everything.", cta: "Shop now", Logo: TikTokLogo },
  { kind: "image", src: "/landing/ads/gymshark-training.webp", brand: "Gymshark", Logo: InstagramLogo },
  { kind: "image", src: "/landing/ads/adidas-outlet.webp", brand: "adidas", Logo: GoogleLogo },
  { kind: "text", brand: "Glow Labs", tone: "butter", headline: "The serum 12,000 people reordered.", cta: "Try it", Logo: PinterestLogo },
  { kind: "image", src: "/landing/ads/nike-sneaker.webp", brand: "Nike", Logo: MetaLogo },
  { kind: "image", src: "/landing/ads/gymshark-essentials.webp", brand: "Gymshark", Logo: TikTokLogo },
  { kind: "text", brand: "Peak Gear", tone: "graphite", headline: "Built for the last mile.", cta: "Learn more", Logo: LinkedInLogo },
  { kind: "image", src: "/landing/ads/adidas-adilette.webp", brand: "adidas", Logo: SnapchatLogo },
] as const;

export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    const match = /^(\d+)(.*)$/.exec(value);
    if (!node || !match || value.includes("/") || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const target = Number(match[1]);
    const suffix = match[2];
    node.textContent = `0${suffix}`;
    trackScrollSpeed();
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        // Counted faster when the visitor is scrolling fast, so the number lands while visible.
        const late = isScrollingFast() || entry.boundingClientRect.top < window.innerHeight * 0.5;
        const duration = late ? 600 : 1300;
        const start = performance.now() + (late ? 0 : 150);
        const tick = (now: number) => {
          const t = Math.min(1, Math.max(0, (now - start) / duration));
          node.textContent = `${Math.round(target * (1 - Math.pow(1 - t, 3)))}${suffix}`;
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.textContent = value;
    };
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

export function AdsStats({ copy }: { copy: LandingShowcaseCopy }) {
  const cards = [...WALL, ...WALL];
  return (
    <section className={styles.ads}>
      <div className={styles.wall} aria-label={copy.adsAria}>
        <div className={styles.wallTrack}>
          {cards.map((ad, index) => (
            <figure
              key={index}
              className={styles.adCard}
              data-tone={ad.kind === "text" ? ad.tone : undefined}
              data-low={(index % WALL.length) % 2 === 1 || undefined}
              aria-hidden={index >= WALL.length || undefined}
            >
              {ad.kind === "image" ? (
                <Image src={ad.src} alt={`${ad.brand} ad`} fill sizes="240px" className={styles.adImage} />
              ) : (
                <span className={styles.textAd}>
                  <b>{ad.brand}</b>
                  <span>{ad.headline}</span>
                  <em>{ad.cta}</em>
                </span>
              )}
              <span className={styles.adPlatform}>
                <ad.Logo className={styles.adPlatformLogo} />
              </span>
              {index % 3 === 1 && (
                <span className={styles.adHeart}>
                  <Heart size={14} fill="currentColor" strokeWidth={0} />
                </span>
              )}
            </figure>
          ))}
        </div>
      </div>
      <div className={styles.stats}>
        {copy.stats.map((stat, index) => (
          <Reveal key={stat.label} className={styles.stat} delay={100 + index * 100} amount={0.4}>
            <span className={styles.statTop}>{stat.top}</span>
            <span className={styles.statValue}>
              <CountUp value={stat.value} />
            </span>
            <span className={styles.statLabel}>
              <Check size={14} strokeWidth={3} aria-hidden="true" />
              {stat.label}
            </span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
