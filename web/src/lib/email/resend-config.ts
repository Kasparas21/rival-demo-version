/**
 * Resend API key: use `RESEND_API_KEY` in Vercel / `.env.local`.
 * Supabase Dashboard “secrets” (e.g. name `resend`) are for Edge Functions — copy the same value into the web app env.
 */

export function getResendApiKey(): string | undefined {
  const k =
    process.env.RESEND_API_KEY?.trim() ||
    process.env.resend?.trim() ||
    process.env.RESEND_SECRET?.trim();
  return k || undefined;
}

/** Verified sender, e.g. `Spy Rival <hello@spy-rival.com>`. Resend requires a verified domain for non-sandbox sends. */
export function getResendFromEmail(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "Spy Rival <hello@spy-rival.com>"
  );
}
