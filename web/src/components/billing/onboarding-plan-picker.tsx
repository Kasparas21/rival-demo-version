"use client";

import { TrialSetupBackgroundSync } from "@/components/onboarding/trial-setup-background-sync";
import { OnboardingCardLocaleSwitcher } from "@/components/onboarding/onboarding-card-locale-switcher";
import { OnboardingFlowHeader } from "@/components/onboarding/onboarding-flow-header";
import { PlanPickerContent } from "@/components/billing/plan-picker-content";
import { RivalVideoShell } from "@/components/ui/rival-video-shell";
import { planPickerGlassClass } from "@/components/ui/glass-styles";
import type { Locale } from "@/lib/i18n/locale";
import type { PlanPickerCopy } from "@/lib/i18n/onboarding/types";
import { onboardingCopyEn } from "@/lib/i18n/onboarding/en";

type Props = {
  locale: Locale;
  localeSwitcherAria?: string;
  copy?: PlanPickerCopy;
  dashboardNext: string;
  testerInviteActive?: boolean;
  checkoutError?: string | null;
};

export function OnboardingPlanPicker({
  locale,
  localeSwitcherAria = onboardingCopyEn.localeSwitcherAria,
  copy = onboardingCopyEn.planPicker,
  dashboardNext,
  testerInviteActive = false,
  checkoutError = null,
}: Props) {
  return (
    <RivalVideoShell footerTint="light">
      <TrialSetupBackgroundSync />
      <div className="w-full max-w-5xl px-1 sm:px-2">
        <OnboardingFlowHeader />

        <div className={planPickerGlassClass}>
          <div className="-mt-0.5 mb-4 flex justify-end">
            <OnboardingCardLocaleSwitcher locale={locale} ariaLabel={localeSwitcherAria} align="end" />
          </div>
          <PlanPickerContent
            copy={copy}
            dashboardNext={dashboardNext}
            variant="page"
            testerInviteActive={testerInviteActive}
            checkoutError={checkoutError}
          />
        </div>
      </div>
    </RivalVideoShell>
  );
}
