import type { ReactNode } from "react";
import Link from "next/link";

import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";

export function LegalPageShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#f8f9fb] font-sans text-[#1a1a1a] antialiased">
      <LandingHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
        <p className="mb-2 text-sm text-[#4a7fa5]">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>{title}</span>
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-[#4a7fa5]">Last updated: {lastUpdated}</p>
        <div className="prose-legal mt-10 space-y-6 text-[15px] leading-relaxed text-[#333]">{children}</div>
      </main>
      <LandingFooter />
    </div>
  );
}
