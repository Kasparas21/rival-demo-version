import { createPolarClient } from "@/lib/billing/polar";

export type DeletePolarCustomerParams = {
  userId: string;
  polarCustomerId?: string | null;
  polarSubscriptionId?: string | null;
};

function isPolarNotFoundError(error: unknown): boolean {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /\b404\b|not found/i.test(message);
}

/**
 * Remove the user from Polar: cancel subscriptions, revoke benefits, clear external id.
 * Uses external id (Supabase user id) first, then polar_customer_id fallback.
 */
export async function deletePolarCustomerForUser(
  params: DeletePolarCustomerParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const polar = createPolarClient();
  const polarCustomerId = params.polarCustomerId?.trim() || null;
  const polarSubscriptionId = params.polarSubscriptionId?.trim() || null;

  try {
    await polar.customers.deleteExternal({
      externalId: params.userId,
      anonymize: true,
    });
    return { ok: true };
  } catch (externalError) {
    if (!isPolarNotFoundError(externalError)) {
      if (polarCustomerId) {
        try {
          await polar.customers.delete({ id: polarCustomerId, anonymize: true });
          return { ok: true };
        } catch (customerError) {
          if (!isPolarNotFoundError(customerError)) {
            return {
              ok: false,
              error:
                customerError instanceof Error
                  ? customerError.message
                  : "Could not delete Polar customer.",
            };
          }
        }
      } else {
        return {
          ok: false,
          error:
            externalError instanceof Error
              ? externalError.message
              : "Could not delete Polar customer.",
        };
      }
    }
  }

  if (polarCustomerId) {
    try {
      await polar.customers.delete({ id: polarCustomerId, anonymize: true });
      return { ok: true };
    } catch (customerError) {
      if (!isPolarNotFoundError(customerError)) {
        return {
          ok: false,
          error:
            customerError instanceof Error
              ? customerError.message
              : "Could not delete Polar customer.",
        };
      }
    }
  }

  if (polarSubscriptionId) {
    try {
      await polar.subscriptions.revoke({ id: polarSubscriptionId });
    } catch (revokeError) {
      if (!isPolarNotFoundError(revokeError)) {
        return {
          ok: false,
          error:
            revokeError instanceof Error
              ? revokeError.message
              : "Could not revoke Polar subscription.",
        };
      }
    }
  }

  return { ok: true };
}
