"use client";

import { useEffect, useState } from "react";

/** Modal is max-w-5xl — use 1 column on small screens, 2 on sm+. */
export function usePlatformAdsModalColumnCount(): number {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const update = () => {
      setCount(window.innerWidth >= 640 ? 2 : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}
