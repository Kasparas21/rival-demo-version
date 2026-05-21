"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

type LandingScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Blur + 3D lift-in for landing content — sections/backgrounds stay static; only inner content animates. */
export function LandingScrollReveal({ children, className = "", delay = 0 }: LandingScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15, margin: "0px 0px -8% 0px" });
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={`[perspective:1200px] ${className}`.trim()}>
      <motion.div
        initial={{
          y: 40,
          rotateX: 10,
          filter: "blur(8px)",
        }}
        animate={
          inView
            ? {
                y: 0,
                rotateX: 0,
                filter: "blur(0px)",
              }
            : undefined
        }
        transition={{
          duration: 0.45,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{ transformOrigin: "50% 100%", transformStyle: "preserve-3d" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
