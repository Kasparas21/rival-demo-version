"use client";

import { type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import { MetaLogo, TikTokLogo } from "@/components/platform-logos";
import type { LandingShowcaseCopy } from "@/lib/i18n/landing/showcase";
import { SlackLogo } from "./brand-marks";
import { Reveal } from "./editorial-motion";
import { GlowCta } from "./glow-cta";
import styles from "./landing-proactive.module.css";

/* ------------------------------------------------------------------------------------------ */
/* Proactive: six example alerts, each with its own little visual.                             */
/* ------------------------------------------------------------------------------------------ */

type Tone = "sky" | "pink" | "lilac" | "butter" | "mint" | "coral";

function AlertCard({
  index,
  tone,
  tag,
  text,
  children,
}: {
  index: number;
  tone: Tone;
  tag: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <Reveal className={styles.alertCell} delay={100 + (index % 3) * 110} amount={0.25}>
      <article className={styles.alertCard} data-tone={tone}>
        <span className={styles.tag}>
          <i />
          {tag}
        </span>
        <p className={styles.alertText}>{text}</p>
        <div className={styles.alertVisual} aria-hidden="true">
          {children}
        </div>
      </article>
    </Reveal>
  );
}

export function Proactive({ copy, ctaHref = "/pricing" }: { copy: LandingShowcaseCopy; ctaHref?: string }) {
  const p = copy.proactive;
  const c = p.cards;
  return (
    <section className={styles.proactive}>
      <div className={styles.head}>
        <Reveal amount={0.4}>
          <h2 className={styles.title}>
            {p.title}
            <span>{p.titleMuted}</span>
          </h2>
        </Reveal>
        <Reveal amount={0.4} delay={200}>
          <GlowCta href={ctaHref} size="lg">
            {p.cta}
          </GlowCta>
        </Reveal>
      </div>

      <div className={styles.grid}>
        <AlertCard index={0} tone="sky" tag={c.launch.tag} text={c.launch.text}>
          <div className={styles.fan}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={styles.miniAd} data-i={i}>
                <MetaLogo className={styles.miniAdLogo} />
                <i className={styles.hook} />
                <i />
                <i />
                <em />
              </span>
            ))}
            <span className={styles.more}>{c.launch.more}</span>
          </div>
        </AlertCard>

        <AlertCard index={1} tone="pink" tag={c.promo.tag} text={c.promo.text}>
          <div className={styles.promoRows}>
            {c.promo.rows.map((row, i) => (
              <span key={row} className={styles.promoRow} style={{ "--i": i } as CSSProperties}>
                <span className={styles.promoIcon}>
                  {i === 0 ? <TikTokLogo className={styles.promoLogo} /> : <Mail size={17} strokeWidth={2.2} />}
                </span>
                <b>{row}</b>
                <em>{c.promo.banner}</em>
              </span>
            ))}
          </div>
        </AlertCard>

        <AlertCard index={2} tone="lilac" tag={c.shift.tag} text={c.shift.text}>
          <div className={styles.shift}>
            <span className={styles.shiftRow} data-dir="down">
              <MetaLogo className={styles.shiftLogo} />
              <b>{c.shift.from}</b>
              <i>
                <span />
              </i>
            </span>
            <span className={styles.shiftRow} data-dir="up">
              <TikTokLogo className={styles.shiftLogo} />
              <b>{c.shift.to}</b>
              <i>
                <span />
              </i>
            </span>
          </div>
        </AlertCard>

        <AlertCard index={3} tone="butter" tag={c.page.tag} text={c.page.text}>
          <div className={styles.priceCard}>
            <span className={styles.priceDots}>
              <i />
              <i />
              <i />
            </span>
            <span className={styles.priceLabel}>{c.page.label}</span>
            <span className={styles.priceValue}>
              <span className={styles.priceOld}>$59</span>
              <span className={styles.priceNew}>$49</span>
            </span>
            <span className={styles.priceChip}>
              <Sparkles size={12} strokeWidth={2.4} />
              {c.page.chip}
            </span>
          </div>
        </AlertCard>

        <AlertCard index={4} tone="mint" tag={c.angle.tag} text={c.angle.text}>
          <div className={styles.angles}>
            {c.angle.rows.map((row, i) => (
              <span key={row.label} className={styles.angleRow} style={{ "--v": row.value / 50, "--i": i } as CSSProperties}>
                <b>{row.label}</b>
                <i>
                  <span />
                </i>
                <em>{row.value}</em>
              </span>
            ))}
            <span className={styles.youChip}>{c.angle.you}</span>
          </div>
        </AlertCard>

        <AlertCard index={5} tone="coral" tag={c.digest.tag} text={c.digest.text}>
          <div className={styles.digest}>
            <span className={styles.digestHead}>
              <SlackLogo className={styles.slack} />
              <b>{c.digest.heading}</b>
            </span>
            {c.digest.items.map((item, i) => (
              <span key={item} className={styles.digestItem} style={{ "--i": i } as CSSProperties}>
                <i data-i={i} />
                {item}
              </span>
            ))}
            <span className={styles.digestSent}>
              {c.digest.slack}
              <ArrowRight size={12} strokeWidth={2.6} />
            </span>
          </div>
        </AlertCard>
      </div>
    </section>
  );
}
