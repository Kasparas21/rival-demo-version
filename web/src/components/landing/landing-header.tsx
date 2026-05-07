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
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4">
      <div
        className={`${glassPillShellClass} flex w-full max-w-5xl items-center gap-2 rounded-full px-3 py-2 sm:gap-4 sm:px-5 sm:py-2.5`}
      >
        <Link
          href="/"
          className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          aria-label="Spy Rival home"
        >
          <RivalLogoImg className="block h-[22px] w-auto max-w-[min(168px,42vw)] object-contain object-left sm:h-[26px]" />
        </Link>

        <nav
          aria-label="Primary"
          className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto whitespace-nowrap py-0.5 text-xs font-medium text-[#1a1a1a] [scrollbar-width:none] sm:gap-5 sm:text-sm [&::-webkit-scrollbar]:hidden"
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

        <div className="h-4 w-px shrink-0 self-center bg-black/[0.12] sm:h-5" aria-hidden />

        <Link
          href="/checkout"
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-black hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a7fa5] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:px-5 sm:py-2 sm:text-sm"
        >
          Start free trial
        </Link>
      </div>
    </header>
  );
}
