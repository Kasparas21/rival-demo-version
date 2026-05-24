import { Resend } from "resend";
import { NextResponse } from "next/server";

import {
  buildAlertDigestEmailHtml,
  buildAlertDigestEmailText,
  getAlertDigestFromEmail,
  type AlertDigestItem,
} from "@/lib/email/alert-digest-email";
import { getResendApiKey } from "@/lib/email/resend-config";
import { authorizeCron } from "@/lib/cron/authorize-cron";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Send consolidated alert emails. Bearer CRON_SECRET. */
async function runSendAlertEmails(req: Request): Promise<NextResponse> {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = getResendApiKey();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Resend not configured" }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  const resend = new Resend(apiKey);
  const from = getAlertDigestFromEmail();
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.spy-rival.com";
  const dashboardUrl = `${appOrigin.replace(/\/$/, "")}/dashboard/spy?tab=alerts`;

  const { data: emailRules, error: rulesErr } = await admin
    .from("alert_rules")
    .select("user_id, alert_type, enabled, notify_email, competitor_id")
    .eq("enabled", true)
    .eq("notify_email", true);

  if (rulesErr) {
    return NextResponse.json({ ok: false, error: rulesErr.message }, { status: 500 });
  }

  const userIds = [...new Set((emailRules ?? []).map((r) => r.user_id))];
  let emailsSent = 0;
  let alertsNotified = 0;

  for (const userId of userIds) {
    const userRules = (emailRules ?? []).filter((r) => r.user_id === userId);
    const enabledTypes = new Set(userRules.map((r) => r.alert_type));

    const { data: pendingAlerts, error: alertsErr } = await admin
      .from("competitor_alerts")
      .select("id, alert_type, severity, title, body, competitor_id, detected_at")
      .eq("user_id", userId)
      .is("notified_at", null)
      .in("severity", ["high", "notable"])
      .in("alert_type", [...enabledTypes])
      .order("detected_at", { ascending: false })
      .limit(50);

    if (alertsErr || !pendingAlerts?.length) continue;

    const matched = pendingAlerts.filter((alert) => {
      const globalRule = userRules.find(
        (r) => r.alert_type === alert.alert_type && r.competitor_id == null
      );
      const scopedRule = userRules.find(
        (r) => r.alert_type === alert.alert_type && r.competitor_id === alert.competitor_id
      );
      const rule = scopedRule ?? globalRule;
      return rule?.notify_email === true && rule.enabled === true;
    });

    if (matched.length === 0) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const email = authUser.user?.email?.trim();
    if (!email) continue;

    const competitorIds = [...new Set(matched.map((a) => a.competitor_id))];
    const { data: comps } = await admin
      .from("saved_competitors")
      .select("id, name, brand_name")
      .in("id", competitorIds);

    const nameById = new Map<string, string>();
    for (const c of comps ?? []) {
      nameById.set(c.id, c.brand_name?.trim() || c.name?.trim() || "Competitor");
    }

    const digestItems: AlertDigestItem[] = matched.slice(0, 15).map((a) => ({
      title: a.title,
      body: a.body,
      competitorName: nameById.get(a.competitor_id) ?? "Competitor",
      severity: a.severity,
      detectedAt: a.detected_at,
    }));

    const { error: sendErr } = await resend.emails.send({
      from,
      to: email,
      subject: `New competitor activity (${digestItems.length} alert${digestItems.length === 1 ? "" : "s"})`,
      html: buildAlertDigestEmailHtml({ alerts: digestItems, dashboardUrl }),
      text: buildAlertDigestEmailText({ alerts: digestItems, dashboardUrl }),
    });

    if (sendErr) {
      console.error("[cron/send-alert-emails] send failed", userId, sendErr);
      continue;
    }

    const ids = matched.map((a) => a.id);
    const nowIso = new Date().toISOString();
    await admin.from("competitor_alerts").update({ notified_at: nowIso }).in("id", ids);

    emailsSent += 1;
    alertsNotified += ids.length;
  }

  const summary = { ok: true, emailsSent, alertsNotified, usersChecked: userIds.length };
  console.info("[cron/send-alert-emails]", summary);
  return NextResponse.json(summary);
}

export async function GET(req: Request): Promise<NextResponse> {
  return runSendAlertEmails(req);
}

export async function POST(req: Request): Promise<NextResponse> {
  return runSendAlertEmails(req);
}
