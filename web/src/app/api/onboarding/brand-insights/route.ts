import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scrapeBrandPreview } from "@/lib/onboarding/firecrawl-brand-preview";
import {
  hostToBrandLabel,
  isPlausiblePublicHostname,
  normalizedWorkspaceHost,
} from "@/lib/onboarding/host";

export const maxDuration = 60;

type Body = { domain?: string };

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

  const fallbackName = hostToBrandLabel(domain);
  const scrape = await scrapeBrandPreview(domain);

  if (!scrape.ok) {
    return NextResponse.json({
      ok: true,
      partial: true,
      domain,
      brandName: fallbackName,
      description: null,
      logoUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
      contextSnippet: null,
      socials: [] as { label: string; href: string }[],
      message: scrape.error,
    });
  }

  const d = scrape.data;
  return NextResponse.json({
    ok: true,
    partial: false,
    domain: d.domain,
    brandName: d.brandName?.trim() || fallbackName,
    description: d.description,
    logoUrl: d.logoUrl ?? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    contextSnippet: d.contextSnippet,
    socials: d.socials,
    resolvedUrl: d.resolvedUrl,
  });
}
