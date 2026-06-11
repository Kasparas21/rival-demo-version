import type { ReactNode } from "react";

import { RivalLogoImg } from "@/components/rival-logo";
import { SeoFooterPostLinks } from "@/components/seo/seo-footer-post-links";

const footerLinks = [
  {
    title: "Product",
    items: ["Solution", "Pricing", "How It Works", "Reviews", "Login"],
  },
  {
    title: "Company",
    items: ["About", "Blog", "Contact"],
  },
  {
    title: "Legal",
    items: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
  },
];

export function BlogShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f1f4] text-gray-800">
      <header className="fixed top-0 left-0 right-0 z-20 px-6 pt-6">
        <div className="mx-auto max-w-[1100px] rounded-[42px] bg-white shadow-lg shadow-black/5">
          <div className="flex min-h-[52px] items-center justify-between gap-4 px-6 py-2.5 sm:min-h-[56px] sm:px-8 sm:py-3">
            <a href="/" className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40">
              <RivalLogoImg className="block h-[26px] w-auto max-w-[160px] object-contain object-left object-bottom sm:h-[30px]" />
            </a>
            <nav className="hidden items-center md:flex">
              <div className="flex items-center gap-5 text-[13px] leading-none sm:gap-6 sm:text-sm">
                {(
                  [
                    ["Solution", true],
                    ["How It Works", false],
                    ["Blog", false],
                    ["FAQ", false],
                    ["Reviews", false],
                  ] as const
                ).map(([item, primary]) => (
                  <a
                    key={item}
                    className={`transition-colors hover:text-gray-900 ${
                      primary ? "font-semibold text-gray-800" : "font-medium text-gray-600"
                    }`}
                    href={item === "Blog" ? "/blog" : "#"}
                  >
                    {item}
                  </a>
                ))}
              </div>
              <span className="mx-3 hidden h-4 w-px shrink-0 bg-gray-300/70 sm:mx-4 md:block" aria-hidden />
              <a
                href="#"
                className="shrink-0 rounded-full bg-gray-900 px-4 py-2 text-[13px] font-semibold leading-none text-white shadow-sm transition-colors hover:bg-gray-800 sm:text-sm"
              >
                Login
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 pb-24 pt-32">{children}</main>

      <footer className="border-t border-gray-200 bg-white/60 py-12">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-10 px-6 md:grid-cols-[1.4fr_2fr]">
          <div>
            <RivalLogoImg className="h-7 w-auto max-w-[160px] object-contain object-left" />
            <p className="mt-3 text-sm text-gray-500">
              AI-powered Facebook ads management that runs your entire ad strategy on autopilot.
            </p>
            <div className="mt-4 flex gap-3 text-lg text-gray-400">
              <span>◎</span>
              <span>◉</span>
              <span>◇</span>
              <span>▷</span>
              <span>♬</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerLinks.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-semibold text-gray-900">{group.title}</p>
                <ul className="mt-3 space-y-2 text-sm text-gray-500">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
            <SeoFooterPostLinks />
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-[1100px] border-t border-gray-200 px-6 pt-6 text-xs text-gray-400">
          © 2026 Rival. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
