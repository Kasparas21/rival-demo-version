"use client";

import {
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* Scroll speed from one passive listener shared by every section. Smooth scrolling glides to a
   stop, so the peak of the last moment counts, not just the current speed. */
let lastY = 0;
let lastTime = 0;
let peak = 0;
let peakTime = 0;
let tracking = false;

export function trackScrollSpeed() {
  if (tracking) return;
  tracking = true;
  lastY = window.scrollY;
  lastTime = performance.now();
  window.addEventListener(
    "scroll",
    () => {
      const now = performance.now();
      const y = window.scrollY;
      const elapsed = now - lastTime;
      if (elapsed > 0) {
        const speed = Math.abs(y - lastY) / elapsed;
        if (speed > peak || now - peakTime > 700) {
          peak = speed;
          peakTime = now;
        }
      }
      lastY = y;
      lastTime = now;
    },
    { passive: true },
  );
}

/** True while the page is moving and was scrolled faster than about 1,000 px a second just now. */
export function isScrollingFast() {
  const now = performance.now();
  return now - lastTime < 300 && now - peakTime < 900 && peak > 1;
}

/**
 * Mouse tilt plus a spotlight that follows the cursor. Both are written straight to two
 * elements' transforms once per frame, so following the mouse never restyles or repaints
 * the rest of the card. The spotlight's parent is the box it moves inside. Wide cards pass a
 * smaller `strength` so their far edges don't swing as much.
 */
export function useTilt(spotRef: RefObject<HTMLElement | null>, strength = 1) {
  const pointer = useRef({ x: 0, y: 0, frame: 0 });

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
    const node = event.currentTarget;
    pointer.current.x = event.clientX;
    pointer.current.y = event.clientY;
    if (pointer.current.frame) return;
    pointer.current.frame = requestAnimationFrame(() => {
      pointer.current.frame = 0;
      const rect = node.getBoundingClientRect();
      const x = (pointer.current.x - rect.left) / rect.width;
      const y = (pointer.current.y - rect.top) / rect.height;
      node.style.transform = `perspective(1200px) rotateX(${((0.5 - y) * 7 * strength).toFixed(2)}deg) rotateY(${((x - 0.5) * 9 * strength).toFixed(2)}deg) translateY(-8px)`;
      if (!node.dataset.hover) node.dataset.hover = "true";
      const spot = spotRef.current;
      const box = spot?.parentElement?.getBoundingClientRect();
      if (spot && box) {
        spot.style.transform = `translate3d(${pointer.current.x - box.left}px, ${pointer.current.y - box.top}px, 0)`;
      }
    });
  };

  const onPointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    cancelAnimationFrame(pointer.current.frame);
    pointer.current.frame = 0;
    const node = event.currentTarget;
    node.style.removeProperty("transform");
    delete node.dataset.hover;
  };

  return { onPointerMove, onPointerLeave };
}

/**
 * Hides a card's moving parts until it is first seen, then lets CSS play them once.
 * Works through data-armed / data-inview attributes, so React never re-renders for it.
 */
export function useFirstSight(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    trackScrollSpeed();
    node.dataset.armed = "true";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        // Reached late (fast scrolling): CSS sequences scale their delays by --seq.
        const late = entry.boundingClientRect.top < window.innerHeight * 0.45 || isScrollingFast();
        node.style.setProperty("--seq", late ? "0.3" : "1");
        node.dataset.inview = "true";
      },
      { threshold: 0.15, rootMargin: "0px 0px 6% 0px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      delete node.dataset.armed;
      delete node.dataset.inview;
    };
  }, [ref]);
}
