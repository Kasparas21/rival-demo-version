import { NextResponse } from "next/server";

import { authorizeAdminRequest, adminCanWrite } from "@/lib/admin/auth";
import { buildQuoteCheckoutHref } from "@/lib/billing/custom-quotes";
import { getAppUrl } from "@/lib/billing/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(_req, supabase, user);
  if (!auth.ok || !adminCanWrite(auth.admin.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: quote, error: fetchError } = await admin
    .from("custom_quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status === "accepted" || quote.status === "revoked") {
    return NextResponse.json({ error: `Cannot send quote in status: ${quote.status}` }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("custom_quotes")
    .update({ status: "sent", sent_at: now, updated_at: now })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const checkoutPath = buildQuoteCheckoutHref(updated.checkout_token);
  const checkoutUrl = `${getAppUrl()}${checkoutPath}`;

  await admin.from("admin_event_log").insert({
    actor_user_id: user!.id,
    target_user_id: updated.user_id,
    event_type: "custom_quote_sent",
    payload: { quote_id: id, checkout_url: checkoutUrl } as Json,
  });

  return NextResponse.json({ ok: true, quote: updated, checkoutUrl, checkoutPath });
}
