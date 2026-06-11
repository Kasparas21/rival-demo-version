import type { Metadata } from "next";

import { ResourceListPage } from "@/components/marketing/resource-list-page";
import { TUTORIAL_ITEMS } from "@/lib/marketing/resource-pages";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";

export const metadata: Metadata = {
  title: "Tutorials | Rival",
  description:
    "Step-by-step tutorials for Rival — add competitors, read the Strategy Map, act on Three Moves, and set up the Monday Digest.",
  alternates: { canonical: "/resources/tutorials" },
  openGraph: { url: "/resources/tutorials" },
};

export default async function TutorialsPage() {
  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);

  return (
    <ResourceListPage
      copy={copy}
      locale={locale}
      breadcrumbLabel="Tutorials"
      pageTitle="tutorials"
      pageSummary="Learn Rival in minutes — from your first competitor scrape to weekly Three Moves."
      items={TUTORIAL_ITEMS.map((item) => ({ type: "tutorial" as const, ...item }))}
    />
  );
}
