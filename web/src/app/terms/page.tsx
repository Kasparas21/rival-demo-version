import type { Metadata } from "next";

import { TermsOfServiceContent } from "@/components/legal/terms-of-service-content";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service | Rival",
  description: "Terms of Service for Rival (spy-rival.com) — competitor advertising intelligence platform.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated="May 23, 2026">
      <TermsOfServiceContent />
    </LegalPageShell>
  );
}
