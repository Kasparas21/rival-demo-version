import type { Metadata } from "next";

import { CookiePolicyContent } from "@/components/legal/cookie-policy-content";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Cookie Policy | Rival",
  description: "How Rival (spy-rival.com) uses cookies and similar technologies on the website and platform.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPageShell title="Cookie Policy" lastUpdated="May 23, 2026">
      <CookiePolicyContent />
    </LegalPageShell>
  );
}
