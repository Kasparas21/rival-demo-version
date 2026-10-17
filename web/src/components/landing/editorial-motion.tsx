"use client";

import { animate } from "framer-motion";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import {
  createContext,
  Children,
  Fragment,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { RivalLogoImg } from "@/components/rival-logo";
import { EditorialBackdrop } from "./editorial-backdrop";
import { isScrollingFast, trackScrollSpeed } from "./editorial-tilt";
import styles from "./editorial-landing.module.css";

// Measured from the Agenzy reference: hero 170px, scroll 80px,
// 100ms section stagger, and a 50ms word stagger with this same spring.
const entranceSpring = {
  type: "spring" as const,
  stiffness: 121,
  damping: 27,
  mass: 0.3,
};
const MotionDisabled = createContext(false);
const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (callback: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const getReduced = () => window.matchMedia(reducedQuery).matches;

export function MotionPage({
  children,
  intro: withIntro = true,
}: {
  children: ReactNode;
  /** The logo curtain is the home page's entrance; other pages open straight away. */
  intro?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const disabled = useSyncExternalStore(
    subscribeReduced,
    getReduced,
    () => false,
  );
  const hasEntered = useRef(false);
  const [intro, setIntro] = useState<"initial" | "playing" | "done">(withIntro ? "initial" : "done");

  useLayoutEffect(() => {
    const page = root.current;
    if (!page) return;
    // Restored scroll positions and anchor visits should reveal their destination immediately.
    if (
      !withIntro ||
      disabled ||
      hasEntered.current ||
      window.scrollY > 10 ||
      window.location.hash
    ) {
      // Resolve the curtain before first paint for restored/reduced-motion visits.
      setIntro("done");
      hasEntered.current = true;
      return;
    }
    setIntro("playing");
    const parts = Array.from(
      page.querySelectorAll<HTMLElement>("[data-hero-enter]"),
    );
    const words = Array.from(
      page.querySelectorAll<HTMLElement>("[data-hero-word]"),
    );
    const controls = [
      ...parts.map((node) =>
        animate(
          node,
          { opacity: [0.001, 1], y: [170, 0] },
          { ...entranceSpring, delay: Number(node.dataset.heroEnter) },
        ),
      ),
      ...words.map((node, index) =>
        animate(
          node,
          {
            opacity: [0.001, 1],
            y: [10, 0],
            filter: ["blur(10px)", "blur(0px)"],
          },
          { ...entranceSpring, delay: 2.1 + index * 0.05 },
        ),
      ),
    ];
    const finish = () => {
      hasEntered.current = true;
      setIntro("done");
      controls.forEach((control) => control.stop());
      [...parts, ...words].forEach((node) => {
        node.style.removeProperty("opacity");
        node.style.removeProperty("transform");
        node.style.removeProperty("filter");
      });
    };
    const finishOnScroll = () => {
      if (window.scrollY > 20) finish();
    };
    const curtainTimer = window.setTimeout(() => {
      setIntro("done");
    }, 3000);
    const finishTimer = window.setTimeout(finish, 5000);
    // The intro never holds up keyboard navigation or someone who starts scrolling.
    page.addEventListener("focusin", finish, { once: true });
    window.addEventListener("scroll", finishOnScroll, { passive: true });
    return () => {
      window.clearTimeout(curtainTimer);
      window.clearTimeout(finishTimer);
      page.removeEventListener("focusin", finish);
      window.removeEventListener("scroll", finishOnScroll);
      controls.forEach((control) => control.stop());
      [...parts, ...words].forEach((node) => {
        node.style.removeProperty("opacity");
        node.style.removeProperty("transform");
        node.style.removeProperty("filter");
      });
    };
  }, [disabled, withIntro]);

  useEffect(() => {
    if (disabled) return;
    const page = root.current;
    if (!page) return;
    const lenis = new Lenis({
      duration: 1,
      lerp: undefined,
      autoRaf: true,
      syncTouch: false,
      // Lenis includes each target's CSS scroll-margin-top in the destination.
      anchors: true,
      prevent: (node) =>
        node.closest('[role="dialog"], [data-lenis-prevent]') !== null,
    });
    // The contact dialog owns the body's existing scroll lock.
    const syncLock = () => {
      const locked =
        document.body.style.overflow === "hidden" ||
        document.documentElement.style.overflow === "hidden";
      if (locked) lenis.stop();
      else lenis.start();
    };
    const lockObserver = new MutationObserver(syncLock);
    lockObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    lockObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
    syncLock();
    const loopObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        (entry.target as HTMLElement).dataset.offscreen = String(
          !entry.isIntersecting,
        );
      });
    });
    page
      .querySelectorAll<HTMLElement>("[data-motion-loop]")
      .forEach((node) => loopObserver.observe(node));
    const tickerObserver = new ResizeObserver((entries) => {
      entries.forEach(({ target }) => {
        const track = target.parentElement;
        if (track?.dataset.tickerSpeed) {
          track.style.animationDuration = `${target.getBoundingClientRect().width / Number(track.dataset.tickerSpeed)}s`;
        }
      });
    });
    page
      .querySelectorAll("[data-ticker-speed] > :first-child")
      .forEach((node) => tickerObserver.observe(node));
    return () => {
      lockObserver.disconnect();
      loopObserver.disconnect();
      tickerObserver.disconnect();
      lenis.destroy();
    };
  }, [disabled]);

  return (
    <MotionDisabled.Provider value={disabled}>
      <div
        ref={root}
        className={styles.page}
        data-intro={intro}
        data-motion={disabled ? "paused" : "running"}
      >
        <EditorialBackdrop paused={disabled} />
        <noscript>
          <style>{`.${styles.intro}{display:none!important}.${styles.page} [data-hero-enter]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <div className={styles.intro} aria-hidden="true">
          <div className={styles.introCurtain} />
          <div className={styles.introMark}>
            <RivalLogoImg />
          </div>
        </div>
        {children}
      </div>
    </MotionDisabled.Provider>
  );
}

/** No-JS output stays visible; viewport motion is enabled only after hydration. */
export function Reveal({
  children,
  className = "",
  delay = 100,
  direction = "up",
  amount = 0.5,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const disabled = useContext(MotionDisabled);
  const revealed = useRef(false);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || revealed.current) return;
    if (disabled || !("IntersectionObserver" in window)) {
      node.dataset.reveal = "visible";
      return;
    }
    const rect = node.getBoundingClientRect();
    if (rect.bottom < 0) {
      node.dataset.reveal = "visible";
      revealed.current = true;
      return;
    }
    node.dataset.reveal = "pending";
    trackScrollSpeed();
    const x = direction === "left" ? -80 : direction === "right" ? 80 : 0;
    const y = direction === "up" ? 80 : 0;
    let control: ReturnType<typeof animate> | undefined;
    // Reached late (fast scrolling): skip the stagger and let CSS sequences inside run at
    // about three times the speed (--seq), so everything has played by the time it's read.
    const reveal = (late: boolean) => {
      revealed.current = true;
      node.style.setProperty("--seq", late ? "0.3" : "1");
      node.dataset.reveal = "visible";
      control = animate(
        node,
        { opacity: [0, 1], x: [x, 0], y: [y, 0] },
        {
          ...entranceSpring,
          delay: late ? 0 : Math.min(delay, 360) / 1000,
          onComplete: () => {
            node.style.removeProperty("transform");
            node.style.removeProperty("opacity");
          },
        },
      );
    };
    const threshold = Math.min(
      amount,
      0.3,
      (window.innerHeight * 0.4) / Math.max(rect.height, 1),
    );
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          reveal(entry.boundingClientRect.top < window.innerHeight * 0.5 || isScrollingFast());
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: "0px 0px 8% 0px",
      },
    );
    observer.observe(node);
    const focus = () => {
      observer.disconnect();
      control?.stop();
      node.dataset.reveal = "visible";
      node.style.removeProperty("opacity");
      node.style.removeProperty("transform");
      revealed.current = true;
    };
    node.addEventListener("focusin", focus);
    return () => {
      observer.disconnect();
      control?.stop();
      node.removeEventListener("focusin", focus);
      node.style.removeProperty("transform");
      node.style.removeProperty("opacity");
      node.dataset.reveal = "visible";
    };
  }, [disabled, direction, delay, amount]);
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${className}`}
      data-reveal-direction={direction}
    >
      {children}
    </div>
  );
}

export function HeroWords({ children }: { children: string }) {
  return (
    <>
      {children.split(/(\s+)/).map((word, index) =>
        /^\s+$/.test(word) ? (
          <Fragment key={index}>{word}</Fragment>
        ) : (
          <span key={index} className={styles.heroWord} data-hero-word>
            {word}
          </span>
        ),
      )}
    </>
  );
}

export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, index) => (
        <Reveal key={index} delay={100 + index * 100} amount={0}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
