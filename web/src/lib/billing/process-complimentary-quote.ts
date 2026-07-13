import { NextResponse, type NextRequest } from "next/server";

import { activateComplimentaryCustomQuote } from "@/lib/billing/activate-complimentary-quote";
import { safeCheckoutNextPath } from "@/lib/billing/checkout-url";
import { getCustomQuoteByToken, isComplimentaryQuote } from "@/lib/billing/custom-quotes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type QuoteAccessUser = { id: string; email?: string | null };

export async function processComplimentaryQuoteAccess(
  request: NextRequest,
  wantsJson: boolean,
  user: QuoteAccessUser,
  quoteToken: string,
): Promise<NextResponse> {
  const admin = createSupabaseAdminClient();
  const quote = await getCustomQuoteByToken(admin, quoteToken);
  if (!quote) {
    return quoteAccessFailure(request, wantsJson, "This access link is invalid or has expired.", 404);
  }
  if (quote.user_id !== user.id) {
    return quoteAccessFailure(request, wantsJson, "This access link belongs to another account.", 403);
  }
  if (!isComplimentaryQuote(quote)) {
    return quoteAccessFailure(
      request,
      wantsJson,
      "This quote requires payment. Use the checkout link from your email.",
      400,
    );
  }

  const activation = await activateComplimentaryCustomQuote(admin, quote, user.id);
  if (!activation.ok) {
    return quoteAccessFailure(request, wantsJson, activation.error, 500);
  }

  const next = safeCheckoutNextPath(request.nextUrl.searchParams.get("next"));
  const destination = next ?? "/dashboard/spy";
  if (wantsJson) {
    return NextResponse.json({ ok: true, redirect: destination, complimentary: true });
  }
  return NextResponse.redirect(new URL(destination, request.nextUrl.origin));
}

function quoteAccessFailure(
  request: NextRequest,
  wantsJson: boolean,
  message: string,
  status = 500,
): NextResponse {
  if (wantsJson) {
    return NextResponse.json({ ok: false, error: message }, { status });
  }
  const returnUrl = new URL("/awaiting-quote", request.nextUrl.origin);
  const next = safeCheckoutNextPath(request.nextUrl.searchParams.get("next"));
  if (next) returnUrl.searchParams.set("next", next);
  returnUrl.searchParams.set("checkout_error", message);
  return NextResponse.redirect(returnUrl);
}

export function loginNextForQuoteApiRequest(request: NextRequest, apiPath: "/api/billing/checkout" | "/api/billing/activate-quote"): string {
  const quote = request.nextUrl.searchParams.get("quote")?.trim();
  if (!quote) {
    return apiPath;
  }
  const params = new URLSearchParams({ quote });
  const next = safeCheckoutNextPath(request.nextUrl.searchParams.get("next"));
  if (next) params.set("next", next);
  return `${apiPath}?${params.toString()}`;
}
