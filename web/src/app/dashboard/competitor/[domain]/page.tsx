import { Suspense } from "react";
import { redirect } from "next/navigation";
import { decodeCompetitorDomainSegment } from "@/lib/competitor-dashboard-url";
import { CompetitorContent } from "../competitor-client";
import CompetitorLoading from "../loading";

export default async function CompetitorDomainPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: encoded } = await params;
  const canonicalHost = decodeCompetitorDomainSegment(encoded);
  if (!canonicalHost) {
    redirect("/dashboard/spy");
  }

  return (
    <Suspense fallback={<CompetitorLoading />}>
      <CompetitorContent pathDomainCanonical={canonicalHost} />
    </Suspense>
  );
}
