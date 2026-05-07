import Link from "next/link";
import { RivalLogoImg } from "@/components/rival-logo";
import { glassPillShellClass } from "@/components/ui/glass-styles";

const NAV_ITEMS = [
  { label: "Solution", sectionId: "solution" },
  { label: "How It Works", sectionId: "how-it-works" },
  { label: "Reviews", sectionId: "reviews" },
  { label: "FAQ", sectionId: "faq" },
  { label: "Affiliates", sectionId: "affiliates" },
] as const;

/** Full floating pill: logo | nav | divider | CTA — fixed at top while scrolling */
export function LandingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={`${glassPillShellClass} flex w-full max-w-5xl items-center justify-between gap-2 rounded-full px-3 py-2 sm:gap-4 sm:px-5 sm:py-2.5`}
      >
        <Link
          href="/"
          className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          aria-label="Spy Rival home"
        >
          <RivalLogoImg className="block h-[21px] w-auto max-w-[132px] object-contain object-left sm:h-[26px] sm:max-w-[168px]" />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-1 items-center justify-center gap-5 whitespace-nowrap py-0.5 text-sm font-medium text-[#1a1a1a] md:flex"
        >
          {NAV_ITEMS.map(({ label, sectionId }) => (
            <a
              key={label}
              href={`/#${sectionId}`}
              className="shrink-0 rounded-sm hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden h-5 w-px shrink-0 self-center bg-black/[0.12] md:block" aria-hidden />

        <Link
          href="/checkout"
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-black hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:px-5 sm:py-2 sm:text-sm"
        >
          <span className="sm:hidden">Start</span>
          <span className="hidden sm:inline">Start free trial</span>
        </Link>
      </div>
    </header>
  );
}
