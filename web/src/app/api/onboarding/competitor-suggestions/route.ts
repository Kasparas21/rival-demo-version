import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchCompetitorCandidates } from "@/lib/onboarding/firecrawl-brand-preview";
import {
  hostToBrandLabel,
  isPlausiblePublicHostname,
  normalizedWorkspaceHost,
} from "@/lib/onboarding/host";

export const maxDuration = 60;

const BLOCKED_ROOTS = new Set([
  "google.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "wikipedia.org",
  "reddit.com",
  "pinterest.com",
  "tiktok.com",
  "crunchbase.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "medium.com",
  "amazon.com",
]);

type Body = { domain?: string; brandName?: string };

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const domain = normalizedWorkspaceHost(String(body.domain ?? "").trim());
  if (!domain || !isPlausiblePublicHostname(domain)) {
    return NextResponse.json({ ok: false, error: "Invalid domain" }, { status: 400 });
  }

  const brandLabel = String(body.brandName ?? "").trim() || hostToBrandLabel(domain);
  const result = await searchCompetitorCandidates({ domain, brandLabel, limitTotal: 10 });

  if (!result.ok) {
    return NextResponse.json({
      ok: true,
      partial: true,
      suggestions: [] as Array<{ domain: string; title?: string; kind: "direct" | "indirect" }>,
      message: result.error,
    });
  }

  const filtered = result.suggestions.filter((s) => {
    const root = s.domain.replace(/^www\./, "").toLowerCase();
    if (BLOCKED_ROOTS.has(root)) return false;
    const parts = root.split(".");
    const base = parts.length >= 2 ? parts.slice(-2).join(".") : root;
    if (BLOCKED_ROOTS.has(base)) return false;
    return true;
  });

  return NextResponse.json({
    ok: true,
    partial: false,
    suggestions: filtered.slice(0, 8),
  });
}
