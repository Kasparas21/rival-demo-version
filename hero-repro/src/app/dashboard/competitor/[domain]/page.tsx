import { redirect } from "next/navigation";
import { decodeCompetitorDomainSegment } from "@/lib/competitor-dashboard-url";

/**
 * hero-repro keeps a single query-driven competitor page; path URLs match production
 * and bridge here so bookmarks / sidebar stay consistent.
 */
export default async function CompetitorDomainBridgePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: encoded } = await params;
  const canonicalHost = decodeCompetitorDomainSegment(encoded);
  if (!canonicalHost) redirect("/dashboard/spy");
  const qs = new URLSearchParams({ url: canonicalHost });
  redirect(`/dashboard/competitor?${qs.toString()}`);
}
