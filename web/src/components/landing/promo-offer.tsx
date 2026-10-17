"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Clock3, TimerReset } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { FIRST_MONTH_OFFER, fillOffer, firstMonthOfferCopy } from "@/lib/promo/first-month-offer";
import {
  freshDeadline,
  getOfferServerSnapshot,
  getOfferSnapshot,
  localDay,
  subscribeOffer,
  updateOffer,
} from "./promo-offer-store";
import { SurprisePopup } from "./surprise-popup";
import styles from "./promo-offer.module.css";

type Geo = { city: string | null; country: string | null };

function flagEmoji(country: string | null): string | null {
  if (!country || !/^[A-Z]{2}$/.test(country)) return null;
  return String.fromCodePoint(...[...country].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

function two(value: number) {
  return String(value).padStart(2, "0");
}

/** "hh:mm:ss" until `deadline`, ticking while `active`; calls `onExpire` once it passes. */
function useCountdown(deadline: number | null, onExpire: () => void, active: boolean) {
  const [seconds, setSeconds] = useState(FIRST_MONTH_OFFER.timerMinutes * 60);
  useEffect(() => {
    if (!active || deadline == null) return;
    let done = false;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && !done) {
        done = true;
        window.clearInterval(id);
        onExpire();
      }
    };
    const id = window.setInterval(tick, 250);
    const first = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [deadline, onExpire, active]);
  return `${two(Math.floor(seconds / 3600))}:${two(Math.floor((seconds % 3600) / 60))}:${two(seconds % 60)}`;
}

/** How many times the offer repeats in each half of the ticker, so it always fills the band. */
const TICKER_REPEATS = 3;

/** How far down the pricing page you scroll before the bottom capsule slides in. */
const STICKY_AFTER_PX = 360;

/**
 * The scratch-card popup: on the landing it opens by itself once a day, when the visitor has
 * scrolled a quarter of the page; `?surprise` in the address opens it again for a demo.
 * The pricing page adds `bar="ticker"` (the offer and its countdown sliding by under its header)
 * and `sticky`: a white capsule with the countdown and a "Redeem" button, fixed to the bottom,
 * that slides in once the visitor scrolls down. Other pages have no bottom button.
 */
export function PromoOffer({
  locale,
  bar = "none",
  autoPopup = true,
  sticky = false,
  stickyHref = "/signup",
}: {
  locale: Locale;
  bar?: "none" | "ticker";
  autoPopup?: boolean;
  sticky?: boolean;
  stickyHref?: string;
}) {
  const copy = firstMonthOfferCopy(locale);
  const offer = useSyncExternalStore(subscribeOffer, getOfferSnapshot, getOfferServerSnapshot);
  const [geo, setGeo] = useState<Geo>({ city: null, country: null });
  const [expired, setExpired] = useState(false);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const autoOpened = useRef(false);
  const ready = offer !== null;
  const claimed = offer?.claimed === true;
  const popupDay = offer?.popupDay ?? null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/geo${window.location.search}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Geo | null) => {
        if (data) setGeo({ city: data.city || null, country: data.country || null });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Once a day, open the scratch card when a quarter of the page has gone by, unless the code
  // is already claimed. `?surprise` skips both checks and opens it after a moment, for demos.
  useEffect(() => {
    if (!ready || autoOpened.current) return;
    const show = () => {
      autoOpened.current = true;
      updateOffer({ popupDay: localDay() });
      setOpen(true);
    };
    if (new URLSearchParams(window.location.search).has("surprise")) {
      const timer = window.setTimeout(show, 2500);
      return () => window.clearTimeout(timer);
    }
    if (!autoPopup || claimed || popupDay === localDay()) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (room > 0 && window.scrollY / room >= FIRST_MONTH_OFFER.popupScrollShare) {
        window.removeEventListener("scroll", onScroll);
        show();
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ready, claimed, popupDay, autoPopup]);

  // The pricing page's capsule slides in once the visitor scrolls down a bit.
  useEffect(() => {
    if (!sticky) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      setShown(window.scrollY > STICKY_AFTER_PX);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sticky]);

  const onExpire = useCallback(() => setExpired(true), []);
  const time = useCountdown(offer?.deadline ?? null, onExpire, bar === "ticker" || sticky);
  // Opening it by hand counts as today's showing, so it won't pop up again by itself.
  const openPopup = useCallback(() => {
    updateOffer({ popupDay: localDay() });
    setOpen(true);
  }, []);
  // Stable, so the open dialog never re-runs its focus setup when the bar re-renders.
  const closePopup = useCallback(() => setOpen(false), []);
  const markClaimed = useCallback(() => updateOffer({ claimed: true }), []);

  const extend = () => {
    updateOffer({ deadline: freshDeadline() });
    setExpired(false);
  };

  const stickyLabel = claimed
    ? fillOffer(copy.sticky.codeReady, { code: FIRST_MONTH_OFFER.code })
    : fillOffer(copy.sticky.redeem, { percent: FIRST_MONTH_OFFER.percentOff });
  const flag = flagEmoji(geo.country);
  const label = geo.city
    ? fillOffer(copy.bar.withCity, { city: geo.city, percent: FIRST_MONTH_OFFER.percentOff })
    : fillOffer(copy.bar.noCity, { percent: FIRST_MONTH_OFFER.percentOff });
  const tickerText = claimed ? fillOffer(copy.bar.codeReady, { code: FIRST_MONTH_OFFER.code }) : label;

  return (
    <>
      {bar === "ticker" && (
        <div className={styles.ticker} role="region" aria-label={copy.bar.timerLabel} data-expired={expired || undefined}>
          {expired ? (
            <div className={styles.tickerExpired}>
              <TimerReset size={17} strokeWidth={2.2} aria-hidden="true" />
              {fillOffer(copy.bar.expired, { minutes: FIRST_MONTH_OFFER.timerMinutes })}
              <button type="button" className={styles.extend} onClick={extend}>
                {copy.bar.extend}
              </button>
            </div>
          ) : (
            <button type="button" className={styles.tickerButton} onClick={openPopup} aria-label={`${tickerText}. ${copy.bar.claim}`}>
              <span className={styles.tickerTrack} aria-hidden="true" data-motion-loop>
                {[0, 1].map((half) => (
                  <span key={half} className={styles.tickerSet}>
                    {Array.from({ length: TICKER_REPEATS }, (_, index) => (
                      <Fragment key={index}>
                        <span className={styles.tickerItem}>
                          {flag && <span className={styles.tickerFlag}>{flag}</span>}
                          {tickerText}
                        </span>
                        <i className={styles.tickerDot} />
                        <span className={styles.tickerTime}>
                          <Clock3 size={16} strokeWidth={2.4} />
                          <b>{time}</b>
                        </span>
                        <i className={styles.tickerDot} />
                      </Fragment>
                    ))}
                  </span>
                ))}
              </span>
            </button>
          )}
        </div>
      )}
      {sticky && (
        <div
          className={styles.capsule}
          data-shown={(shown && !open) || undefined}
          aria-hidden={!shown || open || undefined}
        >
          <span className={styles.capsuleTimer}>
            <Clock3 size={21} strokeWidth={2.3} aria-hidden="true" />
            <span className={styles.digits}>{time}</span>
          </span>
          <Link
            href={stickyHref}
            className={`${styles.sticky} ${styles.stickyInCapsule}`}
            tabIndex={shown && !open ? undefined : -1}
          >
            <span>{stickyLabel}</span>
            <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </div>
      )}
      <SurprisePopup
        open={open}
        claimed={claimed}
        locale={locale}
        onClose={closePopup}
        onClaimed={markClaimed}
      />
    </>
  );
}
