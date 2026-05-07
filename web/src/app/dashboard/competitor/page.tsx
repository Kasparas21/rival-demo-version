"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildCompetitorDashboardPath } from "@/lib/competitor-dashboard-url";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";
import CompetitorLoading from "./loading";

function LegacyCompetitorRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const raw = searchParams.get("url")?.trim();
    if (!raw) {
      router.replace("/dashboard/spy", { scroll: false });
      return;
    }
    const canonical = normalizeCompetitorSlug(raw);
    const base = buildCompetitorDashboardPath(canonical);
    const thin = new URLSearchParams();
    if (searchParams.get("confirmed") === "1") thin.set("confirmed", "1");
    const ch = searchParams.get("channels")?.trim();
    if (ch) thin.set("channels", ch);
    const qs = thin.toString();
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
  }, [router, searchParams]);

  return <CompetitorLoading />;
}

export default function CompetitorLegacyQueryPage() {
  return (
    <Suspense fallback={<CompetitorLoading />}>
      <LegacyCompetitorRedirectInner />
    </Suspense>
  );
}
