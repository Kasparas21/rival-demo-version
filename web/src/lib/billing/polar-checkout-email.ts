/** Domains Polar rejects when pre-filling checkout (DNS / deliverability validation). */
const POLAR_BLOCKED_EMAIL_DOMAINS = new Set([
  "test.com",
  "example.com",
  "example.org",
  "example.net",
  "invalid",
  "localhost",
]);

/**
 * Polar validates `customer_email` against real MX records. Fake dev emails like `*@test.com` fail the whole checkout create call.
 */
export function shouldPrefillPolarCustomerEmail(email: string | null | undefined): boolean {
  const trimmed = email?.trim();
  if (!trimmed) return false;
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return false;
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (POLAR_BLOCKED_EMAIL_DOMAINS.has(domain)) return false;
  return true;
}

export function friendlyPolarCheckoutError(raw: string): string {
  if (/not a valid email address/i.test(raw) && /test\.com/i.test(raw)) {
    return "Checkout could not start because your account email uses test.com, which Polar does not accept. Sign in with a real email (e.g. Gmail), or leave email empty and enter it on the Polar checkout page.";
  }
  if (/not a valid email address/i.test(raw)) {
    return "Checkout could not start because Polar rejected the account email address. Use a real email on your account or enter email on the checkout page.";
  }
  if (/product_price_id/i.test(raw) && /Field required/i.test(raw)) {
    return "Checkout could not start: the Polar product has no active price. In Polar Dashboard → Products, add a recurring price to this product.";
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}
