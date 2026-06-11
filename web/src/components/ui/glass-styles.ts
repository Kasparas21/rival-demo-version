/** Frosted glass material — shared by marketing header pill and locale menu. */
export const glassPillMaterialClass =
  "border border-white/60 bg-white/38 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_14px_48px_-12px_rgba(31,38,135,0.22),0_4px_16px_-4px_rgba(74,127,165,0.12)] backdrop-blur-xl backdrop-saturate-[1.45] ring-1 ring-white/45";

/** Floating pill shells (marketing header, hero competitor search): frosted glass over video/gradients. */
export const glassPillShellClass = `${glassPillMaterialClass} transition-[background-color,border-color,box-shadow] duration-300 hover:border-white/70 hover:bg-white/46`;

/** Dropdown panels — denser frost than the header pill so menu copy stays readable over hero text. */
export const glassPillDropdownMaterialClass =
  "border border-white/75 bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_16px_48px_-8px_rgba(31,38,135,0.28),0_4px_16px_-4px_rgba(74,127,165,0.14)] backdrop-blur-2xl backdrop-saturate-[1.6] ring-1 ring-white/60";

/** Locale + nav dropdowns — same frosted shell, different shape. */
export const glassPillMenuClass = `overflow-hidden rounded-2xl py-1 ${glassPillDropdownMaterialClass}`;

/** Full-screen mobile nav sheet — heaviest frost so hero copy does not bleed through. */
export const glassPillMobileMenuMaterialClass =
  "border border-white/85 bg-white/94 shadow-[inset_0_1px_0_rgba(255,255,255,0.99),0_20px_56px_-12px_rgba(31,38,135,0.34)] backdrop-blur-3xl backdrop-saturate-[1.8] ring-1 ring-white/70";

export const glassPillMobileMenuClass = `overflow-hidden rounded-2xl ${glassPillMobileMenuMaterialClass}`;

/** Signup walls and marketing modals — same heavy frost as the mobile nav sheet. */
export const glassModalShellClass = `rounded-[1.75rem] ${glassPillMobileMenuMaterialClass}`;

/** Shared glass panel + form field styles (login, onboarding, marketing). */
export const glassPanelClass =
  "rounded-[28px] border border-white/60 bg-white/40 px-7 py-9 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] sm:px-10 sm:py-10";

/** Narrower plan-picker shell (onboarding step 6, choose-plan). */
export const planPickerGlassClass =
  "rounded-[28px] border border-white/60 bg-white/40 px-6 py-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-md sm:px-8 sm:py-9";

export const glassInputClass =
  "w-full rounded-2xl border border-white/60 bg-white/35 px-4 py-2.5 text-[15px] font-medium text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] outline-none placeholder:text-gray-600 transition focus:border-white/75 focus:bg-white/45 focus:ring-2 focus:ring-gray-900/10";

export const glassSelectClass =
  "w-full rounded-2xl border border-white/60 bg-white/35 px-4 py-2.5 text-[15px] font-medium text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_24px_rgba(31,38,135,0.05)] outline-none transition focus:border-white/75 focus:bg-white/45 focus:ring-2 focus:ring-gray-900/10 [&>option]:bg-white [&>option]:text-gray-900";

