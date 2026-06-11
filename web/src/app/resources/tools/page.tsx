import type { Metadata } from "next";

import { ResourceListPage } from "@/components/marketing/resource-list-page";
import { TOOL_ITEMS } from "@/lib/marketing/resource-pages";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";

export const metadata: Metadata = {
  title: "Tools | Rival",
  description:
    "Free competitor ad tools from Rival — domain lookup, multi-platform Ad Library, Strategy Map, Stealable Angles, Copy Vault, and Activity Score.",
  alternates: { canonical: "/resources/tools" },
  openGraph: { url: "/resources/tools" },
};

export default async function ToolsPage() {
  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);

  return (
    <ResourceListPage
      copy={copy}
      locale={locale}
      breadcrumbLabel="Tools"
      pageTitle="free adspy tools"
      pageSummary="Jump straight into Rival's most-used workflows — each tool links to the feature or signup flow."
      items={TOOL_ITEMS.map((item) => ({ type: "tool" as const, ...item }))}
    />
  );
}
