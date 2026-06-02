import Link from "next/link";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";
import type { LandingCopy } from "@/lib/i18n/landing/types";

const SUPPORT_EMAIL = "hello@spy-rival.com";

type Props = {
  copy: LandingCopy["footer"];
};

export function LandingFooter({ copy }: Props) {
  return (
    <footer id="affiliates" className={`${landingNavAnchorScrollClasses} overflow-hidden pb-8 pt-14 sm:pt-16`}>
      <LandingScrollReveal className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-9 text-center sm:grid-cols-2 sm:text-left md:grid-cols-3 md:gap-10">
          {copy.columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-xs font-bold tracking-widest text-[#1a1a1a]">
                {col.title}
                <span className="mt-1 block h-0.5 w-6 rounded-full bg-black" />
              </h3>
              <ul className="space-y-3 text-sm text-[#4a7fa5]">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-gray-200 pt-6 text-xs text-gray-400 sm:flex-row sm:justify-between">
          <span>{copy.copyright}</span>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[#4a7fa5]">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </LandingScrollReveal>
    </footer>
  );
}
