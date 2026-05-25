"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  buildRecentPlatformRefreshMessage,
  recentRefreshNoticeStorageKey,
} from "@/lib/ad-library/recent-platform-refresh-copy";
import { competitorHostFromDashboardPathname } from "@/lib/competitor-dashboard-url";

/** Once per session, toast when ad platforms were recently auto-refreshed. */
export function RecentPlatformRefreshNotice() {
  const pathname = usePathname();
  const shownForRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const host = competitorHostFromDashboardPathname(pathname);
    const scopeKey = host || "account";
    if (shownForRef.current.has(scopeKey)) return;

    let cancelled = false;

    void (async () => {
      try {
        const qs = host ? `?domain=${encodeURIComponent(host)}` : "";
        const res = await fetch(`/api/account/recent-platform-refreshes${qs}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;

        const json = (await res.json()) as {
          ok?: boolean;
          refresh?: {
            competitorId: string;
            competitorName: string;
            platforms: string[];
          } | null;
        };

        if (!json.ok || !json.refresh?.platforms?.length) return;

        const noticeKey = recentRefreshNoticeStorageKey(json.refresh.competitorId);
        try {
          if (sessionStorage.getItem(noticeKey) === "1") return;
        } catch {
          /* ignore */
        }

        const message = buildRecentPlatformRefreshMessage({
          platforms: json.refresh.platforms,
          competitorName: host ? json.refresh.competitorName : null,
        });
        if (!message || cancelled) return;

        toast.success(message, { duration: 8000 });
        shownForRef.current.add(scopeKey);

        try {
          sessionStorage.setItem(noticeKey, "1");
        } catch {
          /* ignore */
        }
      } catch {
        /* best-effort */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
