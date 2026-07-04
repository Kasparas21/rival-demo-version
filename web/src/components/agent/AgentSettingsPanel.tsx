"use client";

import Link from "next/link";

/** @deprecated Removed from settings page — use sidebar modal or /dashboard/settings/autopilot */
export function AgentSettingsPanel() {
  return (
    <section className="rounded-2xl border border-[#ececef] bg-[#fafafa] p-6 text-[13px] text-[#71717a]">
      <p>
        Autopilot settings have moved. Use the sidebar control or{" "}
        <Link href="/dashboard/settings/autopilot" className="font-medium text-[#6366f1] hover:underline">
          open full Autopilot settings
        </Link>
        .
      </p>
    </section>
  );
}
