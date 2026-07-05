"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL — redirects to settings with autopilot modal (or history) instead of a separate page. */
export default function AutopilotLegacyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const target =
      hash === "history"
        ? "/dashboard/settings?autopilot=history"
        : "/dashboard/settings?autopilot=open";
    router.replace(target);
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 text-[14px] text-[#71717a]">
      Opening Autopilot…
    </div>
  );
}
