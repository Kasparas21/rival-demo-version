"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type LandingScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Lightweight scroll reveal - CSS transitions only (no framer-motion on landing). */
export function LandingScrollReveal({ children, className = "", delay = 0 }: LandingScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduceMotion(mq.matches);
    syncMotion();
    mq.addEventListener("change", syncMotion);

    const node = ref.current;
    if (!node) {
      mq.removeEventListener("change", syncMotion);
      return;
    }

    if (mq.matches) {
      setVisible(true);
      mq.removeEventListener("change", syncMotion);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", syncMotion);
    };
  }, []);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={`landing-scroll-reveal ${visible ? "landing-scroll-reveal--visible" : ""} ${className}`.trim()}
      style={{ "--landing-reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
