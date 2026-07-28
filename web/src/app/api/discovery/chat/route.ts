import { NextResponse } from "next/server";

import { runDiscoveryAssistantForUser } from "@/lib/discovery/discovery-assistant";
import type { DiscoveryAssistantAttachmentInput } from "@/lib/discovery/discovery-assistant-attachments";
import type { DiscoveryAssistantMessage } from "@/lib/discovery/discovery-assistant-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      brandId?: string;
      brandName?: string;
      message?: string;
      history?: DiscoveryAssistantMessage[];
      currentTab?: string;
      currentFilters?: Record<string, unknown>;
      selectedAdIds?: string[];
      attachments?: DiscoveryAssistantAttachmentInput[];
    };

    const brandId = (body.brandId ?? "").trim();
    const message = (body.message ?? "").trim();
    if (!brandId) {
      return NextResponse.json({ ok: false, error: "brandId required" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ ok: false, error: "message required" }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ ok: false, error: "message too long" }, { status: 400 });
    }

    const selectedAdIds = [...new Set((body.selectedAdIds ?? []).map((id) => id.trim()).filter(Boolean))].slice(
      0,
      8,
    );
    const attachments = (body.attachments ?? []).slice(0, 5);

    const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;

    const response = await runDiscoveryAssistantForUser(
      supabase,
      user.id,
      {
        brandId,
        brandName: body.brandName?.trim() || "Workspace",
        message,
        history: body.history,
        currentTab: body.currentTab,
        currentFilters: body.currentFilters,
        selectedAdIds,
        attachments,
      },
      appOrigin,
    );

    try {
      return NextResponse.json({ ok: true, ...response });
    } catch (serializeErr) {
      const msg =
        serializeErr instanceof Error ? serializeErr.message : "Failed to serialize assistant response";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Discovery assistant failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
