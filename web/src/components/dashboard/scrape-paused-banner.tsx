"use client";

import { useEffect, useState } from "react";

export function ScrapePausedBanner() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/scrape-status");
        if (!res.ok) return;
        const json = (await res.json()) as { scrapePaused?: boolean };
        if (!cancelled) setPaused(Boolean(json.scrapePaused));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!paused) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100">
      Scraping is paused because you have not opened Rival in the last week. You are here now — tracking
      resumes on your next scheduled refresh.
    </div>
  );
}
