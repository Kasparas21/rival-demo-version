import type { Metadata } from "next";

import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Rival (spy-rival.com) — how we collect, use, and protect your personal data.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="May 23, 2026">
      <PrivacyPolicyContent />
    </LegalPageShell>
  );
}
