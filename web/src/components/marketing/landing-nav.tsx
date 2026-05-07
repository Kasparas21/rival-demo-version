import Link from "next/link";
import { RivalLogoImg } from "@/components/rival-logo";

export function LandingNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-6 pointer-events-none">
      <nav className="pointer-events-auto w-full max-w-[860px] rounded-[44px] border border-white/60 bg-white/40 shadow-sm backdrop-blur-md">
        <div className="flex min-h-[52px] items-center justify-between gap-4 px-5 py-2.5 sm:min-h-[56px] sm:gap-6 sm:px-10 sm:py-3">
          <a
            href="/"
            className="flex shrink-0 items-center rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-gray-400/40"
            style={{ textDecoration: "none" }}
          >
            <RivalLogoImg className="block h-[26px] w-auto max-w-[min(200px,42vw)] object-contain object-left object-bottom sm:h-[30px]" />
          </a>
          <nav className="hidden items-center md:flex">
            <div className="flex items-center gap-5 lg:gap-6">
              <a
                href="#solution"
                className="text-[13px] font-semibold leading-none text-gray-800 transition-colors duration-200 hover:text-gray-950 sm:text-sm"
              >
                Solution
              </a>
              <a
                href="#how-it-works"
                className="text-[13px] font-medium leading-none text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:text-sm"
              >
                How It Works
              </a>
              <a
                href="https://rival.ai/blog"
                className="text-[13px] font-medium leading-none text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:text-sm"
              >
                Blog
              </a>
              <a
                href="#faq"
                className="text-[13px] font-medium leading-none text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:text-sm"
              >
                FAQ
              </a>
              <a
                href="#testimonials"
                className="text-[13px] font-medium leading-none text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:text-sm"
              >
                Reviews
              </a>
              <a
                href="/affiliate"
                className="text-[13px] font-medium leading-none text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:text-sm"
              >
                Affiliates
              </a>
            </div>
            <span className="mx-3 hidden h-4 w-px shrink-0 bg-gray-300/70 sm:mx-4 md:block" aria-hidden />
            <Link
              href="/login"
              className="shrink-0 rounded-full bg-gray-900 px-4 py-2 text-[13px] font-semibold leading-none text-white shadow-sm transition-colors duration-200 hover:bg-gray-800 sm:text-sm"
            >
              Sign in
            </Link>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0 md:hidden">
            <Link
              href="/login"
              className="shrink-0 rounded-full bg-gray-900 px-3.5 py-2 text-[12px] font-semibold leading-none text-white shadow-sm transition-colors duration-200 hover:bg-gray-800"
            >
              Sign in
            </Link>
            <button
            type="button"
            className="flex shrink-0 items-center justify-center rounded-lg p-2 transition-colors duration-200 hover:bg-gray-200/50"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-menu h-5 w-5 text-gray-700"
              aria-hidden="true"
            >
              <path d="M4 12h16" />
              <path d="M4 18h16" />
              <path d="M4 6h16" />
            </svg>
          </button>
        </div>
        </div>
      </nav>
    </header>
  );
}
