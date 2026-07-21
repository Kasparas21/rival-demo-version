import { NextResponse } from "next/server";
import { z } from "zod";

import { getPostHogServerClient, getPostHogDistinctId } from "@/lib/analytics/posthog-server";
import { buildSavedEmailInsert } from "@/lib/saved-emails/snapshot";
import { assertCanMutate } from "@/lib/team/permissions";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postBodySchema = z.object({
  competitorEmailId: z.string().uuid(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const { searchParams } = new URL(request.url);
  const competitorId = (searchParams.get("competitorId") ?? "").trim();
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_emails")
    .select("*")
    .eq("user_id", dataUserId)
    .eq("competitor_id", competitorId)
    .order("saved_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedEmails: data ?? [] });
}

export async function POST(request: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  try {
    assertCanMutate(ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }

  let body: z.infer<typeof postBodySchema>;
  try {
    body = postBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const emailId = body.competitorEmailId.trim();

  const { data: srcEmail, error: srcErr } = await supabase
    .from("competitor_emails")
    .select("*")
    .eq("id", emailId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (srcErr || !srcEmail) {
    return NextResponse.json({ ok: false, error: "email not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("saved_emails")
    .select("*")
    .eq("user_id", dataUserId)
    .eq("competitor_id", srcEmail.competitor_id)
    .eq("source_competitor_email_id", srcEmail.id)
    .maybeSingle();

  if (existing) {
    if (body.notes !== undefined && body.notes !== null) {
      const { data: updated, error: updErr } = await supabase
        .from("saved_emails")
        .update({ notes: body.notes.slice(0, 500) })
        .eq("id", existing.id)
        .eq("user_id", dataUserId)
        .select()
        .single();
      if (updErr) {
        return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, savedEmail: updated, wasExisting: true });
    }
    return NextResponse.json({ ok: true, savedEmail: existing, wasExisting: true });
  }

  const insert: Database["public"]["Tables"]["saved_emails"]["Insert"] = buildSavedEmailInsert(
    srcEmail,
    dataUserId,
    body.notes,
  );

  const { data: inserted, error: insertErr } = await supabase
    .from("saved_emails")
    .insert(insert)
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  const posthog = getPostHogServerClient();
  if (posthog) {
    const distinctId = (await getPostHogDistinctId()) ?? user.id;
    posthog.capture({
      distinctId,
      event: "email_saved",
      properties: {
        user_id: user.id,
        competitor_id: srcEmail.competitor_id,
        email_type: srcEmail.email_type,
      },
    });
  }

  return NextResponse.json({ ok: true, savedEmail: inserted });
}
