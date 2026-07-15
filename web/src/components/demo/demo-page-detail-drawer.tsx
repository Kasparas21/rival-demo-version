"use client";

import { useMemo } from "react";

import { PageDetailDrawer } from "@/components/website-tracker/PageDetailDrawer";
import {
  buildDemoPageDetailPayload,
  DEMO_PAGE_DETAIL_COMPETITOR_ID,
  demoTrackedPageSeed,
} from "@/lib/demo/demo-landing-page-detail-payload";

type Props = {
  pageId: string | null;
  onClose: () => void;
};

export function DemoPageDetailDrawer({ pageId, onClose }: Props) {
  const staticDetail = useMemo(
    () => (pageId ? buildDemoPageDetailPayload(pageId) : null),
    [pageId],
  );
  const seedPage = useMemo(() => (pageId ? demoTrackedPageSeed(pageId) : null), [pageId]);

  return (
    <PageDetailDrawer
      competitorId={DEMO_PAGE_DETAIL_COMPETITOR_ID}
      pageId={pageId}
      seedPage={seedPage}
      staticDetail={staticDetail}
      onClose={onClose}
      onUpdated={() => {}}
    />
  );
}
