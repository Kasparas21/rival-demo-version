"use client";

import Image from "next/image";
import { useRef, type CSSProperties } from "react";
import { ArrowRight, ArrowUp, Star } from "lucide-react";
import { ClaudeLogo } from "@/components/landing/ai-assistant-logos";
import type { LandingShowcaseCopy } from "@/lib/i18n/landing/showcase";
import { HiggsfieldMark } from "./brand-marks";
import { Reveal } from "./editorial-motion";
import { useFirstSight } from "./editorial-tilt";
import { GlowCta } from "./glow-cta";
import styles from "./landing-winner.module.css";

const ADS = ["/landing/ads/nike-sale.webp", "/landing/ads/gymshark-training.webp", "/landing/ads/adidas-outlet.webp"];
const PICKED = 1;

/**
 * Rival MCP and Higgsfield MCP working together in one Claude chat: ask for the competitors'
 * best ads, pick one, get the same photo with your branding. The chat plays through once.
 */
export function WinnerInOneMinute({ copy, ctaHref = "/pricing" }: { copy: LandingShowcaseCopy; ctaHref?: string }) {
  const w = copy.winner;
  const c = w.chat;
  const chatRef = useRef<HTMLDivElement>(null);
  useFirstSight(chatRef);
  const step = (n: number) => ({ "--n": n }) as CSSProperties;

  return (
    <section className={styles.winner} id="higgsfield">
      <div className={styles.copy}>
        <Reveal amount={0.3}>
          <span className={styles.kicker}>
            <Image src="/icon.svg" alt="" width={22} height={22} />
            Rival MCP
            <i>+</i>
            <HiggsfieldMark size={22} />
            Higgsfield MCP
          </span>
        </Reveal>
        <Reveal amount={0.3} delay={120}>
          <h2 className={styles.title}>
            {w.title}
            <span>{w.titleMuted}</span>
          </h2>
        </Reveal>
        <Reveal amount={0.3} delay={220}>
          <p className={styles.body}>{w.body}</p>
        </Reveal>
        <ol className={styles.steps}>
          {w.steps.map((text, index) => (
            <Reveal key={text} delay={300 + index * 110} amount={0.3}>
              <li>
                <b>{index + 1}</b>
                {text}
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal amount={0.3} delay={640}>
          <GlowCta href={ctaHref} size="lg">
            {w.cta}
          </GlowCta>
        </Reveal>
      </div>

      <Reveal className={styles.chatCell} direction="right" delay={150} amount={0.2}>
        <div ref={chatRef} className={styles.chat}>
          <div className={styles.chatTop}>
            <ClaudeLogo className={styles.claude} />
            <b>{c.assistant}</b>
            <span className={styles.connected}>
              {c.connected.map((name, index) => (
                <em key={name} data-higgsfield={index === 1 || undefined}>
                  {index === 0 ? <Image src="/icon.svg" alt="" width={16} height={16} /> : <HiggsfieldMark size={16} />}
                  {name}
                  <i />
                </em>
              ))}
            </span>
          </div>

          <div className={styles.thread}>
            <span className={styles.me} style={step(1)}>
              {c.ask}
            </span>
            <span className={styles.tool} style={step(2)}>
              <Image src="/icon.svg" alt="" width={18} height={18} />
              {c.found}
            </span>
            <div className={styles.ai} style={step(3)}>
              <p>{c.reply}</p>
              <span className={styles.ads}>
                {ADS.map((src, index) => (
                  <span key={src} className={styles.ad} data-picked={index === PICKED || undefined}>
                    <Image src={src} alt="" fill sizes="120px" />
                    <b className={styles.adNumber}>{index + 1}</b>
                    <em>{c.days[index]}</em>
                  </span>
                ))}
              </span>
            </div>
            <span className={styles.me} style={step(4)}>
              {c.pick}
            </span>
            <span className={styles.tool} data-higgsfield style={step(5)}>
              <HiggsfieldMark size={20} />
              {c.making}
            </span>
            <div className={styles.ai} style={step(6)}>
              <span className={styles.compare}>
                <span className={styles.compareCol}>
                  <span className={styles.before}>
                    <Image src={ADS[PICKED]} alt="" fill sizes="120px" />
                  </span>
                  <small>{c.theirs}</small>
                </span>
                <span className={styles.compareArrow} aria-hidden="true">
                  <HiggsfieldMark size={26} />
                  <ArrowRight size={16} strokeWidth={2.8} />
                </span>
                <span className={styles.compareCol}>
                  <span className={styles.result}>
                    <Image src={ADS[PICKED]} alt="" fill sizes="200px" />
                    <em>
                      <Star size={11} fill="currentColor" strokeWidth={0} />
                      {c.logo}
                    </em>
                    <i className={styles.resultCta}>{c.cta}</i>
                  </span>
                  <small>{c.yours}</small>
                </span>
              </span>
              <p>{c.done}</p>
            </div>
          </div>

          <div className={styles.input}>
            <span>{c.placeholder}</span>
            <span className={styles.send}>
              <ArrowUp size={17} strokeWidth={2.6} />
            </span>
          </div>
        </div>
        <span className={styles.note}>{w.note}</span>
      </Reveal>
    </section>
  );
}
