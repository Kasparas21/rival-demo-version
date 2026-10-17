"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Plus } from "lucide-react";
import { ONE_PLAN, ONE_PLAN_LIST_USD, formatUsd } from "@/lib/billing/one-plan";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import { Reveal } from "./editorial-motion";
import styles from "./editorial-pricing.module.css";

type PricingCopy = LandingCopy["pricing"];

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    values[key] == null ? match : String(values[key]),
  );
}

/**
 * The one plan as a white card with a rainbow edge and a banner on top (Holo's "Most popular"
 * card): name, struck-through list price, the saving, a gradient button, what's included, the
 * pay-as-you-go add-ons and a link to every feature.
 */
function PlanCard({ copy }: { copy: PricingCopy }) {
  const one = copy.onePlan;
  const saving = Math.round((ONE_PLAN_LIST_USD - ONE_PLAN.monthlyUsd) * 100) / 100;
  const addOns = [
    { price: ONE_PLAN.addOnUsd.competitor, label: one.addOns.competitor },
    { price: ONE_PLAN.addOnUsd.brand, label: one.addOns.brand },
    { price: ONE_PLAN.addOnUsd.landingPage, label: one.addOns.landingPage },
  ];

  return (
    <Reveal className={styles.cell} delay={160} amount={0.2}>
      <article className={styles.card}>
        <p className={styles.banner}>{fill(one.banner, { percent: ONE_PLAN.discountPercent })}</p>
        <div className={styles.body}>
          <span className={styles.nameRow}>
            <span className={styles.planIcon}>
              <Image src="/icon.svg" alt="" width={34} height={34} />
            </span>
            <h3 className={styles.planName}>{one.badge}</h3>
          </span>
          <p className={styles.summary}>{one.summary}</p>

          <div className={styles.priceRow}>
            <span className={styles.srOnly}>
              {formatUsd(ONE_PLAN.monthlyUsd)}
              {copy.perMonth}
            </span>
            <s className={styles.was} aria-hidden="true">
              {formatUsd(ONE_PLAN_LIST_USD)}
            </s>
            <span className={styles.price} aria-hidden="true">
              {formatUsd(ONE_PLAN.monthlyUsd)}
            </span>
            <span className={styles.perMonth} aria-hidden="true">
              {copy.perMonth}
            </span>
          </div>
          <span className={styles.save}>{fill(one.save, { amount: formatUsd(saving) })}</span>

          <Link
            href="/signup"
            className={styles.cta}
          >
            <span className={styles.ctaLabel}>{copy.trialCta}</span>
            <span className={styles.ctaArrow} aria-hidden="true">
              <ArrowRight size={20} strokeWidth={2.6} />
            </span>
          </Link>
          <p className={styles.note}>{copy.trialNote}</p>

          <span className={styles.divider} aria-hidden="true" />

          <ul className={styles.features}>
            {one.includes.map((item) => (
              <li key={item}>
                <Check size={19} strokeWidth={2.6} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <p className={styles.subhead}>{one.addOnsTitle}</p>
          <ul className={styles.features}>
            {addOns.map((addOn) => (
              <li key={addOn.label}>
                <Plus size={19} strokeWidth={2.6} aria-hidden="true" />
                <span>
                  <b>{formatUsd(addOn.price)}</b> {addOn.label}
                </span>
              </li>
            ))}
          </ul>

          <Link href="/features" className={styles.more}>
            <span>{one.more}</span>
            <span className={styles.moreAll}>
              {one.viewAll}
              <i>
                <Plus size={15} strokeWidth={2.8} aria-hidden="true" />
              </i>
            </span>
          </Link>
        </div>
      </article>
    </Reveal>
  );
}

/** One plan, one card. */
export function PricingPlans({ copy }: { copy: PricingCopy }) {
  return (
    <div className={styles.pricing} data-motion-loop>
      <PlanCard copy={copy} />
    </div>
  );
}
