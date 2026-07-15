export type NonMarketingEmailKind =
  | "verification_code"
  | "password_reset"
  | "account_security"
  | "order_update"
  | "other_transactional";

export type NonMarketingEmailDetection = {
  kind: NonMarketingEmailKind;
  label: string;
  summary: string;
};

export const SKIPPED_TRANSACTIONAL_ANALYSIS_VERSION = "skipped_transactional_v1";

const PATTERN_GROUPS: Array<{
  kind: NonMarketingEmailKind;
  label: string;
  patterns: RegExp[];
}> = [
  {
    kind: "verification_code",
    label: "Verification email",
    patterns: [
      /one[- ]?time (code|verification|passcode)/i,
      /verification code/i,
      /verify your (email|account|identity|profile)/i,
      /confirm your (email|account)/i,
      /\bOTP\b/,
      /security code/i,
      /login code/i,
      /authentication code/i,
      /access code/i,
      /profile code/i,
      /member profile code/i,
      /here(?:'|')?s your (?:one[- ]?time )?code/i,
      /your (?:one[- ]?time )?(?:verification |security |login |access )?code/i,
    ],
  },
  {
    kind: "password_reset",
    label: "Password reset email",
    patterns: [
      /password reset/i,
      /reset (?:your )?password/i,
      /forgot (?:your )?password/i,
      /change your password/i,
      /password recovery/i,
    ],
  },
  {
    kind: "account_security",
    label: "Account security email",
    patterns: [
      /unusual (?:sign[- ]?in|activity|login)/i,
      /new (?:sign[- ]?in|login|device)/i,
      /suspicious activity/i,
      /account (?:locked|suspended|security alert)/i,
    ],
  },
  {
    kind: "order_update",
    label: "Order update email",
    patterns: [
      /order confirmation/i,
      /your order (?:has been |is )?(?:confirmed|shipped|delivered)/i,
      /shipping confirmation/i,
      /tracking (?:number|info|update)/i,
      /delivery (?:update|confirmation)/i,
    ],
  },
];

function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getEmailBodyForDetection(row: {
  plain_text?: string | null;
  html_body?: string | null;
}): string {
  const plain = row.plain_text?.trim();
  if (plain) return plain;
  const html = row.html_body?.trim();
  if (html) return stripHtmlToPlainText(html);
  return "";
}

function buildHaystack(args: {
  subject: string | null;
  preview_text: string | null;
  body: string;
}): string {
  return [args.subject, args.preview_text, args.body.slice(0, 2000)]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
}

export function detectNonMarketingEmail(args: {
  subject: string | null;
  preview_text: string | null;
  body: string;
}): NonMarketingEmailDetection | null {
  const haystack = buildHaystack(args);
  if (!haystack.trim()) return null;

  for (const group of PATTERN_GROUPS) {
    if (group.patterns.some((pattern) => pattern.test(haystack))) {
      return {
        kind: group.kind,
        label: group.label,
        summary: `${group.label} — not analyzed for marketing intelligence.`,
      };
    }
  }

  return null;
}

export function isSkippedTransactionalAnalysis(row: {
  ai_analysis_version?: string | null;
}): boolean {
  return row.ai_analysis_version === SKIPPED_TRANSACTIONAL_ANALYSIS_VERSION;
}

export function isNonMarketingEmailRow(row: {
  ai_analysis_version?: string | null;
  email_type?: string | null;
  subject?: string | null;
  preview_text?: string | null;
  plain_text?: string | null;
  html_body?: string | null;
}): boolean {
  if (isSkippedTransactionalAnalysis(row)) return true;
  return Boolean(
    detectNonMarketingEmail({
      subject: row.subject ?? null,
      preview_text: row.preview_text ?? null,
      body: getEmailBodyForDetection(row),
    }),
  );
}
