"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Presentation } from "lucide-react";

import { isDebugPlatformClassificationEnabled } from "@/lib/debug/platform-classification";
import {
  DASHBOARD_DEMO_DEFAULT_PATH,
  isDashboardDemoPath,
} from "@/lib/demo/dashboard-demo-config";

const DEMO_BUTTON_TITLE =
  "Sales demo — static data only, visible with NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION";

export function DemoSidebarLink({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  if (!isDebugPlatformClassificationEnabled()) return null;

  const active = isDashboardDemoPath(pathname);

  return (
    <Link
      href={DASHBOARD_DEMO_DEFAULT_PATH}
      scroll={false}
      title={DEMO_BUTTON_TITLE}
      className={`relative flex items-center rounded-xl transition-colors ${
        active
          ? collapsed
            ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
            : "bg-amber-50/90 text-amber-950 ring-1 ring-amber-200/80"
          : "text-[#52525b] hover:bg-white/75 hover:text-[color:var(--rival-primary)]"
      } ${collapsed ? "size-11 shrink-0 justify-center" : "w-full gap-3 px-3 py-2.5"}`}
    >
      <span
        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white"
        aria-hidden
      />
      <Presentation className={`shrink-0 ${collapsed ? "h-[18px] w-[18px]" : "h-[18px] w-[18px]"}`} />
      {!collapsed ? <span className="text-[14px] font-medium">Demo</span> : null}
    </Link>
  );
}
