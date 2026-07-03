import { NextResponse } from "next/server";

import {
  getOrCreateAgentSettings,
  parseAgentChannels,
} from "@/lib/agent/settings";
import { friendlyAgentApiError } from "@/lib/agent/api-errors";
import type { AgentChannelsConfig } from "@/lib/agent/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { Database } from "@/lib/supabase/types";

type AgentSettingsUpdate = Database["public"]["Tables"]["agent_settings"]["Update"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function settingsPayload(row: Awaited<ReturnType<typeof getOrCreateAgentSettings>>, email: string | null) {
  return {
    ok: true,
    settings: {
      enabled: row.enabled,
      channels: parseAgentChannels(row.channels),
      min_threat_score: row.min_threat_score,
      weekly_brief_enabled: row.weekly_brief_enabled,
      weekly_brief_day: row.weekly_brief_day,
      weekly_brief_time: row.weekly_brief_time,
      user_email: email,
    },
  };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getOrCreateAgentSettings(supabase, user.id);
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).maybeSingle();

    return NextResponse.json(settingsPayload(settings, profile?.email ?? user.email ?? null));
  } catch (err) {
    const message = friendlyAgentApiError(err instanceof Error ? err.message : String(err));
    console.error("[api/agent/settings] GET", err);
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}

type PatchBody = {
  enabled?: boolean;
  channels?: AgentChannelsConfig;
  min_threat_score?: number;
  weekly_brief_enabled?: boolean;
  weekly_brief_day?: string;
  weekly_brief_time?: string;
};

export async function PATCH(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: PatchBody = {};
    try {
      body = (await req.json()) as PatchBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    await getOrCreateAgentSettings(supabase, user.id);

    const update: AgentSettingsUpdate = {};
    if (typeof body.enabled === "boolean") update.enabled = body.enabled;
    if (body.channels && typeof body.channels === "object") update.channels = body.channels as Json;
    if (typeof body.min_threat_score === "number") {
      const score = Math.round(body.min_threat_score);
      if (score < 6 || score > 10) {
        return NextResponse.json({ ok: false, error: "min_threat_score must be 6–10" }, { status: 400 });
      }
      update.min_threat_score = score;
    }
    if (typeof body.weekly_brief_enabled === "boolean") update.weekly_brief_enabled = body.weekly_brief_enabled;
    if (typeof body.weekly_brief_day === "string") update.weekly_brief_day = body.weekly_brief_day;
    if (typeof body.weekly_brief_time === "string") update.weekly_brief_time = body.weekly_brief_time;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("agent_settings")
      .update(update)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !updated) {
      return NextResponse.json({ ok: false, error: error?.message ?? "Update failed" }, { status: 500 });
    }

    const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).maybeSingle();
    return NextResponse.json(settingsPayload(updated, profile?.email ?? user.email ?? null));
  } catch (err) {
    const message = friendlyAgentApiError(err instanceof Error ? err.message : String(err));
    console.error("[api/agent/settings] PATCH", err);
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
