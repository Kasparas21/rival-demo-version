"use client";

import { useEffect, useState } from "react";

/** Match Discovery feed breakpoints: 1 / sm:2 / xl:3 / 2xl:4 columns. */
export function useMasonryColumnCount(): number {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1536) setCount(4);
      else if (w >= 1280) setCount(3);
      else if (w >= 640) setCount(2);
      else setCount(1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}

export function distributeMasonryColumns<T>(items: T[], columnCount: number): T[][] {
  const safeCount = Math.max(1, columnCount);
  const columns: T[][] = Array.from({ length: safeCount }, () => []);
  for (let i = 0; i < items.length; i++) {
    columns[i % safeCount]!.push(items[i]!);
  }
  return columns;
}
