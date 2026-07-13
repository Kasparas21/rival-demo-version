import type { SupabaseClient } from "@supabase/supabase-js";

import { getPolarCustomProductId } from "@/lib/billing/config";
import {
  isComplimentaryQuote,
  markCustomQuoteAccepted,
  type CustomQuoteRow,
} from "@/lib/billing/custom-quotes";
import type { Database, Json } from "@/lib/supabase/types";

export const COMPLIMENTARY_CUSTOM_PRODUCT_ID = "complimentary-custom-quote";

function polarProductIdForComplimentaryQuote(): string {
  try {
    return getPolarCustomProductId();
  } catch {
    return COMPLIMENTARY_CUSTOM_PRODUCT_ID;
  }
}

function complimentaryPeriodEnd(billingPeriod: CustomQuoteRow["billing_period"]): string {
  const end = new Date();
  if (billingPeriod === "annual") {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return end.toISOString();
}

export async function activateComplimentaryCustomQuote(
  admin: SupabaseClient<Database>,
  quote: CustomQuoteRow,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isComplimentaryQuote(quote)) {
    return { ok: false, error: "This quote requires payment." };
  }
  if (quote.user_id !== userId) {
    return { ok: false, error: "This link belongs to another account." };
  }

  const now = new Date().toISOString();
  const acceptError = await markCustomQuoteAccepted(admin, quote.id);
  if (acceptError) {
    return { ok: false, error: acceptError };
  }

  const rawPayload = {
    source: "rival_complimentary_quote",
    complimentary_quote_id: quote.id,
    billing_period: quote.billing_period,
    complimentary: true,
  } satisfies Record<string, unknown>;

  const { error: billingError } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      polar_product_id: polarProductIdForComplimentaryQuote(),
      polar_product_name: "Custom plan (complimentary)",
      status: "active",
      current_period_end: complimentaryPeriodEnd(quote.billing_period),
      raw_payload: rawPayload as Json,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (billingError) {
    return { ok: false, error: billingError.message };
  }

  try {
    await admin.from("admin_event_log").insert({
      target_user_id: userId,
      event_type: "custom_quote_accepted",
      payload: { quote_id: quote.id, complimentary: true } as Json,
    });
  } catch {
    // Non-blocking audit log.
  }

  return { ok: true };
}
