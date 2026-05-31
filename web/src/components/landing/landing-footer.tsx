import Link from "next/link";
import { LandingScrollReveal } from "@/components/landing/landing-scroll-reveal";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

const SUPPORT_EMAIL = "hello@spy-rival.com";

const columns = [
  {
    title: "PRODUCT",
    links: [
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Compare", href: "/#compare" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
      { label: "Start trial", href: "/onboarding" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "About", href: "/about" },
      { label: "Contact", href: `mailto:${SUPPORT_EMAIL}` },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer id="affiliates" className={`${landingNavAnchorScrollClasses} overflow-hidden pb-8 pt-14 sm:pt-16`}>
      <LandingScrollReveal className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-9 text-center sm:grid-cols-2 sm:text-left md:grid-cols-3 md:gap-10">
          {columns.map((col) => (
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
          <span>© 2026 Spy-Rival</span>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[#4a7fa5]">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </LandingScrollReveal>
    </footer>
  );
}
