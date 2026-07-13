import { NextResponse, type NextRequest } from "next/server";

import { ensureUserProfile } from "@/lib/auth/profile";
import { buildAwaitingQuoteHref, safeCheckoutNextPath } from "@/lib/billing/checkout-url";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import {
  loginNextForQuoteApiRequest,
  processComplimentaryQuoteAccess,
} from "@/lib/billing/process-complimentary-quote";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const wantsJson = request.nextUrl.searchParams.get("intent") === "json";
  const quoteToken = request.nextUrl.searchParams.get("quote")?.trim();
  if (!quoteToken) {
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: "Missing quote token." }, { status: 400 });
    }
    return NextResponse.redirect(
      new URL(buildAwaitingQuoteHref(safeCheckoutNextPath(request.nextUrl.searchParams.get("next"))), request.nextUrl.origin),
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("next", loginNextForQuoteApiRequest(request, "/api/billing/activate-quote"));
    return NextResponse.redirect(loginUrl);
  }

  await ensureUserProfile(supabase, user);

  const billing = await getBillingEntitlement(supabase, user.id);
  if (billing.isUnlimited) {
    if (wantsJson) {
      return NextResponse.json({ ok: true, redirect: "/dashboard/spy" });
    }
    return NextResponse.redirect(new URL("/dashboard/spy", request.nextUrl.origin));
  }

  try {
    return await processComplimentaryQuoteAccess(request, wantsJson, user, quoteToken);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not activate access.";
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
    const returnUrl = new URL("/awaiting-quote", request.nextUrl.origin);
    returnUrl.searchParams.set("checkout_error", message);
    return NextResponse.redirect(returnUrl);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
