import Link from "next/link";
import { landingNavAnchorScrollClasses } from "@/components/landing/landing-nav-anchor";

const columns = [
  {
    title: "PRODUCT",
    links: [
      { label: "Solution", href: "#solution" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
      { label: "Start Trial", href: "/checkout" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Help Center", href: "mailto:hello@spy-rival.com" },
      { label: "Support", href: "mailto:hello@spy-rival.com" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "About", href: "#solution" },
      { label: "Contact", href: "mailto:hello@spy-rival.com" },
      { label: "hello@spy-rival.com", href: "mailto:hello@spy-rival.com" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Privacy Policy", href: "mailto:hello@spy-rival.com" },
      { label: "Terms of Service", href: "mailto:hello@spy-rival.com" },
    ],
  },
];

function SocialIcons() {
  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href="#"
        aria-label="X"
        className="flex size-9 items-center justify-center rounded-full bg-white text-[#4a7fa5] shadow-sm hover:bg-neutral-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </Link>
      <Link
        href="#"
        aria-label="LinkedIn"
        className="flex size-9 items-center justify-center rounded-full bg-white text-[#4a7fa5] shadow-sm hover:bg-neutral-50"
      >
        <span className="text-xs font-black">in</span>
      </Link>
      <Link
        href="#"
        aria-label="YouTube"
        className="flex size-9 items-center justify-center rounded-full bg-white text-[#4a7fa5] shadow-sm hover:bg-neutral-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M10 9.5v5l6-2.6-6-2.4z" />
          <path d="M21.593 9.203c-.25-1.12-1.13-2-2.253-2.25C17.697 6.547 12 6.547 12 6.547s-5.694 0-7.34.407c-1.12.25-2 1.13-2.252 2.253C2 11.03 2 15.547 2 15.547s0 4.517.408 6.344c.25 1.12 1.13 2 2.253 2.253 1.644.406 7.34.406 7.34.406s5.694 0 7.34-.407c1.122-.252 2-1.132 2.253-2.253.407-1.827.407-6.344.407-6.344s-.002-4.517-.408-6.347zM10 17.893V8.2l6.853 4.853L10 17.893z" />
        </svg>
      </Link>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer id="affiliates" className={`${landingNavAnchorScrollClasses} overflow-hidden bg-[#f5f0e5] pb-8 pt-14 sm:pt-16`}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-9 text-center sm:grid-cols-2 sm:text-left md:grid-cols-4 md:gap-10">
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

        <div className="mt-12 flex flex-col items-center gap-6 border-t border-gray-200 pt-6 text-xs text-gray-400 md:flex-row md:justify-between">
          <span>© 2026 Spy Rival</span>
          <SocialIcons />
          <a href="mailto:hello@spy-rival.com" className="hover:text-[#4a7fa5]">
            Support: hello@spy-rival.com
          </a>
        </div>
      </div>
    </footer>
  );
}
