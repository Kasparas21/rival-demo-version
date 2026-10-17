"use client";

import { FIRST_MONTH_OFFER } from "@/lib/promo/first-month-offer";

/**
 * The visitor's offer state, kept in localStorage and read through useSyncExternalStore.
 * Each new day starts a fresh countdown; the popup opens at most once a day.
 */
export type OfferState = {
  day: string;
  deadline: number;
  popupDay: string | null;
  claimed: boolean;
};

const KEY = "rival-offer-v2";
const listeners = new Set<() => void>();
let cache: OfferState | null = null;

export function localDay(time = Date.now()): string {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function freshDeadline(): number {
  return Date.now() + FIRST_MONTH_OFFER.timerMinutes * 60_000;
}

function persist(state: OfferState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private windows and blocked storage just lose the state on reload.
  }
}

function load(): OfferState {
  const day = localDay();
  let saved: Partial<OfferState> | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<OfferState> | null;
  } catch {
    saved = null;
  }
  const deadline =
    saved?.day === day && typeof saved.deadline === "number" ? saved.deadline : freshDeadline();
  return {
    day,
    deadline,
    popupDay: typeof saved?.popupDay === "string" ? saved.popupDay : null,
    claimed: saved?.claimed === true,
  };
}

export function getOfferSnapshot(): OfferState | null {
  if (!cache) {
    cache = load();
    persist(cache);
  }
  return cache;
}

export function getOfferServerSnapshot(): OfferState | null {
  return null;
}

export function subscribeOffer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function updateOffer(patch: Partial<OfferState>) {
  const current = getOfferSnapshot();
  if (!current) return;
  cache = { ...current, ...patch };
  persist(cache);
  listeners.forEach((listener) => listener());
}
