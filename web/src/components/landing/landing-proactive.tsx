"use client";

import Image from "next/image";

import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import { MetaLogo, TikTokLogo } from "@/components/platform-logos";
import type { LandingShowcaseCopy } from "@/lib/i18n/landing/showcase";
import { SlackLogo } from "./brand-marks";
import { Reveal } from "./editorial-motion";
import { prefersReducedMotion, useFirstSight } from "./editorial-tilt";
import { GlowCta } from "./glow-cta";
import { CountUp } from "./landing-showcase";
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

/* ------------------------------------------------------------------------------------------ */
/* Outperform: a statement that lights up word by word, a big 24/7 and an example chart.       */
/* ------------------------------------------------------------------------------------------ */

const CHART_POINTS: Array<[number, number]> = [
  [0, 176],
  [50, 172],
  [100, 178],
  [150, 170],
  [200, 174],
  [250, 150],
  [300, 128],
  [350, 112],
  [400, 92],
  [450, 80],
  [500, 62],
  [550, 50],
  [600, 36],
];

/** A smooth curve through the points (Catmull-Rom turned into cubic Béziers). */
function smoothPath(points: Array<[number, number]>) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i - 1] ?? points[i];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[i + 2] ?? points[i + 1];
    const c1 = `${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)}`;
    const c2 = `${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)}`;
    d += ` C${c1}, ${c2}, ${x2} ${y2}`;
  }
  return d;
}

const LINE = smoothPath(CHART_POINTS);
const AREA = `${LINE} L600 220 L0 220 Z`;

/** Words brighten one by one while the statement scrolls through the middle of the screen. */
function useLitWords(ref: RefObject<HTMLElement | null>, count: number) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) {
      node.style.setProperty("--lit", String(count));
      return;
    }
    let frame = 0;
    let last = -1;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (vh * 0.82 - rect.top) / (vh * 0.42)));
      const lit = Math.round(progress * count);
      if (lit !== last) {
        last = lit;
        node.style.setProperty("--lit", String(lit));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      } else {
        window.removeEventListener("scroll", onScroll);
      }
    });
    observer.observe(node);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ref, count]);
}

export function Outperform({ copy }: { copy: LandingShowcaseCopy }) {
  const o = copy.outperform;
  const words = o.text.split(" ");
  const textRef = useRef<HTMLParagraphElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const statRef = useRef<HTMLDivElement>(null);
  useLitWords(textRef, words.length);
  useFirstSight(chartRef);
  useFirstSight(statRef);

  return (
    <section className={styles.outperform}>
      <div className={styles.outGrid}>
        <div className={styles.outCopy}>
          <p ref={textRef} className={styles.statement} style={{ "--lit": words.length } as CSSProperties}>
            {words.map((word, i) => (
              <span key={i} style={{ "--w": i } as CSSProperties}>
                {word}{" "}
              </span>
            ))}
          </p>
          <div ref={statRef} className={styles.outStat}>
            <span className={styles.outValue}>{o.stat}</span>
            <span className={styles.outLabel}>{o.statLabel}</span>
            <span className={styles.outBar} aria-hidden="true">
              <i />
            </span>
          </div>
        </div>

        <Reveal className={styles.chartCell} direction="right" delay={150} amount={0.3}>
          <div ref={chartRef} className={styles.chart}>
            <div className={styles.chartHead}>
              <b>{o.chartTitle}</b>
              <span className={styles.chartChips}>
                {o.chips.map((chip) => (
                  <span key={chip}>{chip}</span>
                ))}
              </span>
            </div>
            <div className={styles.tiles}>
              {o.tiles.map((tile) => (
                <span key={tile.label} className={styles.tile}>
                  <span>{tile.label}</span>
                  <b>
                    <CountUp value={tile.value} />
                  </b>
                </span>
              ))}
            </div>
            <div className={styles.plot}>
              <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="outperform-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#9ad1ff" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#9ad1ff" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="outperform-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#9fb3c4" />
                    <stop offset="0.34" stopColor="#4a7fa5" />
                    <stop offset="1" stopColor="#2f6fd6" />
                  </linearGradient>
                </defs>
                {[55, 110, 165].map((y) => (
                  <line key={y} x1="0" x2="600" y1={y} y2={y} className={styles.gridLine} />
                ))}
                <path d={AREA} className={styles.area} />
                <path d={LINE} className={styles.line} pathLength={1} />
              </svg>
              <span className={styles.marker}>
                <span className={styles.markerLabel}>
                  <Image src="/icon.svg" alt="" width={18} height={18} className={styles.markerFox} />
                  {o.marker}
                </span>
              </span>
              <span className={styles.endDot} data-motion-loop />
            </div>
            <div className={styles.months}>
              {o.months.map((month) => (
                <span key={month}>{month}</span>
              ))}
            </div>
          </div>
          <span className={styles.chartNote}>{o.note}</span>
        </Reveal>
      </div>
    </section>
  );
}
