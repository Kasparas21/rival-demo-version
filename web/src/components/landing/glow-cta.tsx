"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import styles from "./glow-cta.module.css";

/**
 * Rival's main call to action: a graphite pill with a turning light edge, a soft glow, a shine
 * and a nudging arrow. Pressing it throws a little confetti.
 */
export function GlowCta({
  href,
  children,
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${styles.cta} ${className}`}
      data-size={size}
    >
      <span className={styles.edge} aria-hidden="true" />
      <span className={styles.fill} aria-hidden="true" />
      <span className={styles.label}>{children}</span>
      <ArrowRight className={styles.arrow} size={size === "lg" ? 19 : 17} strokeWidth={2.2} aria-hidden="true" />
    </Link>
  );
}
