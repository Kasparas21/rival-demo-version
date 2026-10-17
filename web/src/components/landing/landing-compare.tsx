"use client";

import Image from "next/image";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { BellRing, Eye, Layers, MessageCircle, Sparkles, X } from "lucide-react";
import { GoogleLogo, LinkedInLogo, MetaLogo, TikTokLogo, YouTubeLogo } from "@/components/platform-logos";
import type { LandingShowcaseCopy } from "@/lib/i18n/landing/showcase";
import { ChatGptLogo, ClaudeLogo } from "./ai-assistant-logos";
import { HiggsfieldMark, SlackLogo } from "./brand-marks";
import { Reveal } from "./editorial-motion";
import { useFirstSight } from "./editorial-tilt";
import { GlowCta } from "./glow-cta";
import styles from "./landing-compare.module.css";

type CompareCopy = LandingShowcaseCopy["compare"];

/** What each "with Rival" line is about, as an icon tile in front of it. */
const ROW_ICONS: ReactNode[] = [
  <Layers key="feed" size={19} strokeWidth={2.4} />,
  <MessageCircle key="chat" size={19} strokeWidth={2.4} />,
  <Eye key="pages" size={19} strokeWidth={2.4} />,
  <BellRing key="alert" size={19} strokeWidth={2.4} />,
  <Sparkles key="remake" size={19} strokeWidth={2.4} />,
];

/** The little proof on the right of each "with Rival" line. */
function Proof({ index, copy }: { index: number; copy: CompareCopy }): ReactNode {
  switch (index) {
    case 0:
      return (
        <span className={styles.logos}>
          <MetaLogo className={styles.logo} />
          <TikTokLogo className={styles.logo} />
          <GoogleLogo className={styles.logo} />
          <LinkedInLogo className={styles.logo} />
          <YouTubeLogo className={styles.logo} />
        </span>
      );
    case 1:
      return (
        <span className={styles.logos}>
          <ClaudeLogo className={styles.logo} />
          <ChatGptLogo className={styles.logo} />
        </span>
      );
    case 2:
      return (
        <span className={styles.pill}>
          <i className={styles.liveDot} data-motion-loop />
          {copy.live}
        </span>
      );
    case 3:
      return (
        <span className={styles.pill}>
          <SlackLogo className={styles.logo} />
          {copy.channel}
        </span>
      );
    default:
      return (
        <span className={styles.pill}>
          <HiggsfieldMark size={20} />
          {copy.minute}
        </span>
      );
  }
}

/**
 * Without Rival vs with Rival. The left card is pale and its lines get crossed out; the right
 * card is graphite with a turning light edge, an icon tile and a small proof on every line.
 * Rows have a fixed height on desktop so each pain sits level with its answer.
 */
export function RivalCompare({ copy, ctaHref = "/pricing" }: { copy: LandingShowcaseCopy; ctaHref?: string }) {
  const c = copy.compare;
  const boardRef = useRef<HTMLDivElement>(null);
  useFirstSight(boardRef);

  return (
    <section className={styles.compare}>
      <Reveal amount={0.5}>
        <h2 className={styles.title}>
          {c.title} <span>{c.titleMuted}</span>
        </h2>
      </Reveal>

      <div ref={boardRef} className={styles.board}>
        <Reveal className={styles.withoutCell} delay={80} amount={0.2}>
          <article className={styles.without}>
            <header className={styles.head}>
              <span className={styles.noTile}>
                <X size={18} strokeWidth={3} />
              </span>
              <b>{c.without}</b>
            </header>
            <ul className={styles.rows}>
              {c.rows.map((row, i) => (
                <li key={row.topic} className={styles.row} style={{ "--i": i } as CSSProperties}>
                  <span className={styles.cross}>
                    <X size={13} strokeWidth={3} />
                  </span>
                  <span className={styles.text}>
                    <small>{row.topic}</small>
                    <s>
                      <span>{row.without}</span>
                    </s>
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </Reveal>

        <span className={styles.vs} aria-hidden="true">
          {c.vs}
        </span>

        <Reveal className={styles.withCell} delay={200} amount={0.2}>
          <article className={styles.with}>
            <span className={styles.edge} data-motion-loop aria-hidden="true" />
            <span className={styles.fill} aria-hidden="true" />
            <header className={styles.head}>
              <span className={styles.foxTile}>
                <Image src="/icon.svg" alt="" width={26} height={26} />
              </span>
              <b className={styles.withName}>{c.with}</b>
              <span className={styles.badge}>{c.badge}</span>
            </header>
            <ul className={styles.rows}>
              {c.rows.map((row, i) => (
                <li key={row.topic} className={styles.row} style={{ "--i": i } as CSSProperties}>
                  <span className={styles.tick}>{ROW_ICONS[i]}</span>
                  <span className={styles.text}>
                    <small>{row.topic}</small>
                    <b>{row.with}</b>
                  </span>
                  <span className={styles.proof}>
                    <Proof index={i} copy={c} />
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.foot}>
              <GlowCta href={ctaHref} size="lg">
                {c.cta}
              </GlowCta>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
