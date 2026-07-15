import { Suspense } from "react";
import { redirect } from "next/navigation";

import { decodeCompetitorDomainSegment } from "@/lib/competitor-dashboard-url";
import {
  DASHBOARD_DEMO_DEFAULT_PATH,
  isDashboardDemoDomain,
} from "@/lib/demo/dashboard-demo-config";
import { DashboardDemoClient } from "@/components/demo/dashboard-demo-client";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";

export default async function DashboardDemoCompetitorPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: encoded } = await params;
  const canonicalHost = decodeCompetitorDomainSegment(encoded);
  if (!canonicalHost || !isDashboardDemoDomain(canonicalHost)) {
    redirect(DASHBOARD_DEMO_DEFAULT_PATH);
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center px-6">
          <RivalLoadingBlock padded={false} />
        </div>
      }
    >
      <DashboardDemoClient domain={canonicalHost} />
    </Suspense>
  );
}
