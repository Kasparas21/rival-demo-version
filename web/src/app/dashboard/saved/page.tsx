import { Suspense } from "react";

import { SavedPageClient } from "@/components/saved/saved-page-client";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";

export const metadata = {
  title: "Saved | Spy Rival",
  description: "Your bookmarked ads, emails, organic posts, and landing pages in one place.",
};

export default function SavedPage() {
  return (
    <Suspense fallback={<RivalLoadingBlock />}>
      <SavedPageClient />
    </Suspense>
  );
}
