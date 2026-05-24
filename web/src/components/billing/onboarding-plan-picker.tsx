"use client";

import Link from "next/link";
import { PlanPickerContent } from "@/components/billing/plan-picker-content";
import { RivalLogoImg } from "@/components/rival-logo";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { planPickerGlassClass } from "@/components/ui/glass-styles";

type Props = {
  dashboardNext: string;
  testerInviteActive?: boolean;
};

export function OnboardingPlanPicker({ dashboardNext, testerInviteActive = false }: Props) {
  return (
    <RivalVideoShell footerTint="light">
      <div className="w-full max-w-5xl px-1 sm:px-2">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="rounded-2xl border border-white/60 bg-white/40 px-5 py-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]"
          >
            <RivalLogoImg className="h-8 w-auto max-w-[180px] object-contain object-center sm:h-9" />
          </Link>
        </div>

        <div className={planPickerGlassClass}>
          <PlanPickerContent
            dashboardNext={dashboardNext}
            variant="page"
            testerInviteActive={testerInviteActive}
          />
        </div>
      </div>
    </RivalVideoShell>
  );
}
