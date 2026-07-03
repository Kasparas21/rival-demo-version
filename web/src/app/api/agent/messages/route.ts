import { NextResponse } from "next/server";

import { friendlyAgentApiError, isAgentSchemaMissingError } from "@/lib/agent/api-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: messages, error, count } = await supabase
      .from("agent_messages")
      .select("id, competitor_id, signal_ids, channels_delivered, subject, sent_at, status", { count: "exact" })
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .range(from, to);

    if (error) {
      if (isAgentSchemaMissingError(error.message)) {
        return NextResponse.json({ ok: true, page, pageSize: PAGE_SIZE, total: 0, messages: [] });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const competitorIds = [...new Set((messages ?? []).map((m) => m.competitor_id).filter(Boolean))] as string[];
    const namesById = new Map<string, string>();

    if (competitorIds.length > 0) {
      const { data: comps } = await supabase
        .from("saved_competitors")
        .select("id, name, brand_name")
        .in("id", competitorIds);

      for (const c of comps ?? []) {
        namesById.set(c.id, c.brand_name?.trim() || c.name?.trim() || "Competitor");
      }
    }

    return NextResponse.json({
      ok: true,
      page,
      pageSize: PAGE_SIZE,
      total: count ?? 0,
      messages: (messages ?? []).map((m) => ({
        id: m.id,
        competitor_id: m.competitor_id,
        competitor_name: m.competitor_id ? namesById.get(m.competitor_id) ?? "Competitor" : "Cross-competitor",
        subject: m.subject,
        channels: m.channels_delivered,
        sent_at: m.sent_at,
        status: m.status,
        signal_count: m.signal_ids?.length ?? 0,
      })),
    });
  } catch (err) {
    const message = friendlyAgentApiError(err instanceof Error ? err.message : String(err));
    console.error("[api/agent/messages] GET", err);
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
