"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type LazyFeaturePreviewProps = {
  children: ReactNode;
  className?: string;
  minHeight?: number;
};

/** Mount preview demos only when scrolled near viewport — keeps mobile scroll smooth. */
export function LazyFeaturePreview({ children, className = "", minHeight = 280 }: LazyFeaturePreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? children : null}
    </div>
  );
}
