"use client";

import { Fragment, useLayoutEffect, useRef, type CSSProperties, type RefObject } from "react";
import { Check, Mail, Search } from "lucide-react";
import { ChatGptLogo, ClaudeLogo } from "@/components/landing/ai-assistant-logos";
import type { LandingShowcaseCopy } from "@/lib/i18n/landing/showcase";
import { HiggsfieldMark, SlackLogo } from "./brand-marks";
import { prefersReducedMotion } from "./editorial-tilt";
import styles from "./landing-story.module.css";

/**
 * Scroll distances (in screen heights from the moment the section reaches the top) where the
 * story moves on: four words, the switch, the first tail, then the three cards.
 */
const STEPS = [-0.2, 0, 0.13, 0.26, 0.4, 0.52, 0.7, 1.5, 2.3];
const FIRST_CARD_STEP = 7;

/** Steps the pinned story forward and back as the page scrolls. Only attributes change. */
function useStory(section: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = section.current;
    if (!root || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    root.setAttribute("data-live", "");
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-at]"));
    const tails = Array.from(root.querySelectorAll<HTMLElement>("[data-tail]"));
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-card]"));
    const dots = Array.from(root.querySelectorAll<HTMLElement>("[data-dot]"));
    let step = -1;
    let frame = 0;

    const apply = (next: number) => {
      step = next;
      items.forEach((node) => node.toggleAttribute("data-on", next >= Number(node.dataset.at)));
      const tail = next < 6 ? -1 : next - 6;
      tails.forEach((node, index) => {
        node.dataset.state = index === tail ? "active" : index < tail ? "past" : "next";
      });
      const active = next - FIRST_CARD_STEP;
      cards.forEach((node, index) => {
        node.dataset.state = index === active ? "active" : index < active ? "past" : "next";
        node.style.setProperty("--depth", String(Math.max(0, active - index)));
      });
      dots.forEach((node, index) => node.toggleAttribute("data-on", index === active));
      root.toggleAttribute("data-docked", next >= FIRST_CARD_STEP);
    };

    const measure = () => {
      frame = 0;
      const scrolled = -root.getBoundingClientRect().top / window.innerHeight;
      let next = 0;
      while (next < STEPS.length && scrolled >= STEPS[next]) next += 1;
      if (next !== step) apply(next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) window.addEventListener("scroll", onScroll, { passive: true });
        else window.removeEventListener("scroll", onScroll);
        onScroll();
      },
      { rootMargin: "50% 0px" },
    );
    observer.observe(root);
    window.addEventListener("resize", onScroll);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      root.removeAttribute("data-live");
    };
  }, [section]);
}

/** Slack, email, Claude, ChatGPT and Higgsfield, in the copy's order. */
const INTEGRATION_ICONS = [
  (className: string) => <SlackLogo className={className} />,
  () => <Mail size={16} strokeWidth={2.2} />,
  (className: string) => <ClaudeLogo className={className} />,
  (className: string) => <ChatGptLogo className={className} />,
  () => <HiggsfieldMark size={18} />,
];

export function ScrollStory({ copy }: { copy: LandingShowcaseCopy }) {
  const s = copy.story;
  const sectionRef = useRef<HTMLElement>(null);
  useStory(sectionRef);

  const visuals = [
    <div key="niche" className={styles.visual} data-tone="sky">
      <span className={styles.search}>
        <Search size={18} strokeWidth={2.4} />
        <span className={styles.typed}>{s.cards[0].search}</span>
        <i className={styles.caret} />
      </span>
      <span className={styles.niches}>
        {s.niches.map((niche, i) => (
          <em key={niche} data-hit={i === 1 || undefined} style={{ "--i": i } as CSSProperties}>
            {niche}
            {i === 1 && <Check size={14} strokeWidth={3} />}
          </em>
        ))}
      </span>
    </div>,
    <div key="market" className={styles.visual} data-tone="butter">
      <span className={styles.search}>
        <Search size={18} strokeWidth={2.4} />
        <span className={styles.typed}>{s.cards[1].search}</span>
        <i className={styles.caret} />
      </span>
      <span className={styles.markets}>
        {s.markets.map((market, i) => {
          const hit = market.name === s.cards[1].search;
          return (
            <span key={market.code} className={styles.market} data-hit={hit || undefined} style={{ "--i": i } as CSSProperties}>
              <i className={styles.flag} data-code={market.code} />
              {market.name}
              {hit && <Check size={14} strokeWidth={3} />}
            </span>
          );
        })}
      </span>
    </div>,
    <div key="team" className={styles.visual} data-tone="lilac">
      <span className={styles.search}>
        <Search size={18} strokeWidth={2.4} />
        <span className={styles.typed}>{s.cards[2].search}</span>
        <i className={styles.caret} />
      </span>
      <span className={styles.brands}>
        {s.brands.map((brand, i) => (
          <span key={brand.name} className={styles.brand} data-hit={i === 0 || undefined} style={{ "--i": i } as CSSProperties}>
            <i data-i={i}>{brand.name.slice(0, 1)}</i>
            <b>{brand.name}</b>
            <em>{brand.rivals}</em>
          </span>
        ))}
      </span>
      <span className={styles.integrations}>
        {s.integrations.map((name, i) => (
          <span key={name} style={{ "--i": i } as CSSProperties}>
            {(INTEGRATION_ICONS[i] ?? INTEGRATION_ICONS[1])(styles.integrationLogo)}
            {name}
          </span>
        ))}
      </span>
    </div>,
  ];

  return (
    <section ref={sectionRef} className={styles.story}>
      <div className={styles.stage}>
        <span className={styles.glow} aria-hidden="true" />
        <div className={styles.phrase}>
          <p className={styles.words}>
            {s.words.map((word, i) => (
              <Fragment key={i}>
                <span className={styles.word} data-at={i + 1}>
                  {word}
                </span>{" "}
              </Fragment>
            ))}
            <span className={styles.switch} data-at={5} aria-hidden="true">
              <i />
            </span>
          </p>
          <span className={styles.tails}>
            {s.tails.map((tail, i) => (
              <span key={tail} className={styles.tail} data-tail={i}>
                {tail}
              </span>
            ))}
          </span>
        </div>

        <div className={styles.cards}>
          {s.cards.map((card, i) => (
            <article key={card.title} className={styles.card} data-card={i}>
              <div className={styles.cardCopy}>
                <span className={styles.cardCount}>0{i + 1}</span>
                <h3 className={styles.cardTitle}>
                  {card.title}
                  <span>{card.titleMuted}</span>
                </h3>
                <p className={styles.cardBody}>{card.body}</p>
              </div>
              {visuals[i]}
            </article>
          ))}
        </div>

        <span className={styles.dots} aria-hidden="true">
          {s.cards.map((card) => (
            <i key={card.title} data-dot />
          ))}
        </span>
      </div>
    </section>
  );
}
