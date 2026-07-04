import type { Metadata } from "next";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ReportPageProps = {
  params: Promise<{ reportId: string }>;
};

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicReportPage({ params }: ReportPageProps) {
  const { reportId } = await params;
  const id = reportId.trim();
  if (!id) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <p>Report not found.</p>
      </main>
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("autopilot_outputs")
    .select("payload, output_type, status")
    .eq("id", id)
    .eq("output_type", "monthly_report")
    .maybeSingle();

  const payload = row?.payload as { html?: string } | null;
  const html = payload?.html?.trim();

  if (!html) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <p>Report not found or not yet generated.</p>
      </main>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
