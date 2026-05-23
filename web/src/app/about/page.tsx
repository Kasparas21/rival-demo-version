import type { Metadata } from "next";
import Link from "next/link";

import { AboutContent } from "@/components/legal/about-content";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";

export const metadata: Metadata = {
  title: "About | Rival",
  description:
    "Rival was built by performance marketers who got tired of guessing what competitors were doing — one dashboard for Meta, Google, TikTok, LinkedIn, Pinterest, and Snapchat.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#f8f9fb] font-sans text-[#1a1a1a] antialiased">
      <LandingHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
        <p className="mb-2 text-sm text-[#4a7fa5]">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>About</span>
        </p>
        <AboutContent />
      </main>
      <LandingFooter />
    </div>
  );
}
