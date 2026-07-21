import { Resend } from "resend";

import { buildEmailTokenCallbackUrl } from "@/lib/auth/build-email-token-callback-url";
import { getResendApiKey, getResendFromEmail } from "@/lib/email/resend-config";
import { pickHashedTokenFromGenerateLinkProperties } from "@/lib/auth/pick-hashed-token-from-generate-link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ownerDisplayLabel, type WorkspaceOwnerInfo } from "@/lib/team/workspace-context";

const INVITE_EXPIRY_DAYS = 30;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function teamInviteAcceptPath(inviteToken: string): string {
  return `/team/accept/${encodeURIComponent(inviteToken.trim())}`;
}

export function teamInviteExpiresAt(from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + INVITE_EXPIRY_DAYS);
  return d.toISOString();
}

function buildInviteEmailHtml(params: {
  ownerLabel: string;
  acceptUrl: string;
}): string {
  const { ownerLabel, acceptUrl } = params;
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:560px;background:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;padding:28px 24px;">
            <tr>
              <td>
                <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">You're invited to a Rival workspace</h1>
                <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.55;">
                  <strong>${escapeHtml(ownerLabel)}</strong> invited you to view their competitor intelligence workspace on Rival.
                  You'll get read-only access to their scraped ads, strategy maps, and shared AI insights.
                </p>
                <p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.5;">
                  Scraping and billing stay on their account. You can still keep your own Rival workspace and switch between the two anytime.
                </p>
                <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;background:#111827;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:999px;">Accept invite</a>
                <p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;line-height:1.5;">
                  This link expires in ${INVITE_EXPIRY_DAYS} days. If you didn't expect this email, you can ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildInviteEmailText(params: { ownerLabel: string; acceptUrl: string }): string {
  return [
    `You're invited to a Rival workspace`,
    "",
    `${params.ownerLabel} invited you to view their competitor intelligence workspace on Rival.`,
    "You'll get read-only access to their scraped ads, strategy maps, and shared AI insights.",
    "",
    `Accept invite: ${params.acceptUrl}`,
    "",
    `This link expires in ${INVITE_EXPIRY_DAYS} days.`,
  ].join("\n");
}

export async function buildTeamInviteMagicLinkUrl(params: {
  inviteeEmail: string;
  inviteToken: string;
  appOrigin?: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const email = params.inviteeEmail.trim().toLowerCase();
  const appOrigin = params.appOrigin?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
  const nextPath = teamInviteAcceptPath(params.inviteToken);
  const redirectTo = `${appOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const admin = createSupabaseAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
  });

  if (
    createError &&
    !createError.message.toLowerCase().includes("already") &&
    !createError.message.toLowerCase().includes("registered") &&
    !createError.message.toLowerCase().includes("exists")
  ) {
    return { ok: false, error: createError.message };
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  const hashedToken = pickHashedTokenFromGenerateLinkProperties(linkData?.properties);
  if (linkError || !hashedToken) {
    return { ok: false, error: linkError?.message ?? "Could not generate sign-in link" };
  }

  const url = buildEmailTokenCallbackUrl({
    origin: appOrigin,
    hashedToken,
    otpType: "email",
    nextPath,
  });

  return { ok: true, url };
}

export async function sendTeamInviteEmail(params: {
  to: string;
  owner: WorkspaceOwnerInfo;
  inviteToken: string;
  appOrigin?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { ok: false, error: "Resend is not configured (RESEND_API_KEY missing)." };
  }

  const ownerLabel = ownerDisplayLabel(params.owner);
  const magic = await buildTeamInviteMagicLinkUrl({
    inviteeEmail: params.to,
    inviteToken: params.inviteToken,
    appOrigin: params.appOrigin,
  });

  if (!magic.ok) {
    return { ok: false, error: magic.error };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: params.to.trim().toLowerCase(),
    subject: `${ownerLabel} invited you to view their Rival workspace`,
    html: buildInviteEmailHtml({ ownerLabel, acceptUrl: magic.url }),
    text: buildInviteEmailText({ ownerLabel, acceptUrl: magic.url }),
  });

  if (error) {
    return { ok: false, error: error.message ?? "Email send failed" };
  }

  return { ok: true };
}
