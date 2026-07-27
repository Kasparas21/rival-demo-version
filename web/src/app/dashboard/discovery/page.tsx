import { Suspense } from "react";

import { DiscoveryPageClient } from "@/components/discovery/discovery-page-client";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";

export const metadata = {
  title: "Discovery | Spy Rival",
  description: "Browse ads from all tracked competitors in one inspiration feed.",
};

export default function DiscoveryPage() {
  return (
    <Suspense fallback={<RivalLoadingBlock />}>
      <DiscoveryPageClient />
    </Suspense>
  );
}
