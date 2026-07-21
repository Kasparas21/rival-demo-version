import { Suspense } from "react";
import { redirect } from "next/navigation";

import { decodeCompetitorDomainSegment } from "@/lib/competitor-dashboard-url";
import { CompetitorContent } from "@/app/dashboard/competitor/competitor-content-loader";
import CompetitorLoading from "@/app/dashboard/competitor/loading";

export default async function PreviewCompetitorDomainPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: encoded } = await params;
  const canonicalHost = decodeCompetitorDomainSegment(encoded);
  if (!canonicalHost) {
    redirect("/preview/spy");
  }

  return (
    <Suspense fallback={<CompetitorLoading />}>
      <CompetitorContent pathDomainCanonical={canonicalHost} />
    </Suspense>
  );
}
