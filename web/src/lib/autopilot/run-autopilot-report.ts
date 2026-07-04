import { randomUUID } from "crypto";
import { Resend } from "resend";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getBillingEntitlement } from "@/lib/billing/entitlements";
import type { PlanTier } from "@/lib/billing/plan-limits";
import { getResendApiKey, getResendFromEmail } from "@/lib/email/resend-config";
import type { Database } from "@/lib/supabase/types";

import { acquireAutopilotCronLock, releaseAutopilotCronLock } from "./cron-lock";
import { aggregateWorkspaceReport } from "./report-aggregate";
import { generateReportExecutiveSummary } from "./report-generate";
import { renderMonthlyReportHtml, reportEmailPreviewBullets } from "./report-render-html";
import { buildReportPublicUrl } from "./watch-deep-links";
import type { AutopilotSettingsRow, ReportBranding } from "./types";

export type AutopilotReportRunSummary = {
  ok: boolean;
  mode: "production" | "test" | "preview";
  generated: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function parseReportBranding(raw: unknown): ReportBranding {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { logo_url: null, agency_name: null, accent_color: null, hide_powered_by: false };
  }
  const o = raw as Record<string, unknown>;
  return {
    logo_url: typeof o.logo_url === "string" ? o.logo_url : null,
    agency_name: typeof o.agency_name === "string" ? o.agency_name : null,
    accent_color: typeof o.accent_color === "string" ? o.accent_color : null,
    hide_powered_by: o.hide_powered_by === true,
  };
}

function parseReportWorkspaces(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

const MAX_REPORT_SEND_ATTEMPTS = 3;

function monthDedupeKey(userId: string, brandId: string, now: Date): string {
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `report:${userId}:${brandId}:${ym}`;
}

function isAgencyTier(tier: PlanTier): boolean {
  return tier === "agency" || tier === "admin";
}

function canUseReports(tier: PlanTier): boolean {
  return tier === "pro" || tier === "agency" || tier === "admin";
}

export async function generateMonthlyReportForWorkspace(params: {
  admin: SupabaseClient<Database>;
  userId: string;
  brandId: string;
  settings: Pick<AutopilotSettingsRow, "report_branding">;
  planTier: PlanTier;
  preview?: boolean;
  now?: Date;
}): Promise<{ outputId: string; reportUrl: string; retrySendOnly?: boolean } | { error: string }> {
  const now = params.now ?? new Date();
  const data = await aggregateWorkspaceReport(params.admin, params.userId, params.brandId, now);
  if (!data) return { error: "workspace_not_found" };

  const dedupeKey = params.preview
    ? `report_preview:${params.userId}:${params.brandId}:${now.toISOString().slice(0, 10)}`
    : monthDedupeKey(params.userId, params.brandId, now);

  if (!params.preview) {
    const { data: existing } = await params.admin
      .from("autopilot_outputs")
      .select("id, status, payload")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    if (existing?.status === "sent") {
      return { outputId: existing.id, reportUrl: "" };
    }
    if (existing?.status === "failed") {
      const payload = existing.payload as { _meta?: { sendAttempts?: number } } | null;
      const attempts = payload?._meta?.sendAttempts ?? 0;
      if (attempts >= MAX_REPORT_SEND_ATTEMPTS) {
        return { outputId: existing.id, reportUrl: "" };
      }
      const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
      return {
        outputId: existing.id,
        reportUrl: buildReportPublicUrl(appOrigin, existing.id, "email"),
        retrySendOnly: true,
      };
    }
  }

  const summary = await generateReportExecutiveSummary(data);
  const branding = isAgencyTier(params.planTier)
    ? parseReportBranding(params.settings.report_branding)
    : { logo_url: null, agency_name: null, accent_color: null, hide_powered_by: false };

  const html = renderMonthlyReportHtml({
    data,
    summary,
    branding,
    isAgency: isAgencyTier(params.planTier),
    generatedAt: now.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" }),
  });

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
  const outputId = randomUUID();

  const { error: insertErr } = await params.admin.from("autopilot_outputs").upsert(
    {
      id: outputId,
      user_id: params.userId,
      output_type: "monthly_report",
      dedupe_key: dedupeKey,
      payload: {
        html,
        brandId: params.brandId,
        brandName: data.brandName,
        periodLabel: data.periodLabel,
        summary,
        preview: params.preview === true,
        _meta: { sendAttempts: 0 },
      },
      channels_sent: [],
      status: "pending",
      error: null,
    },
    { onConflict: "dedupe_key" },
  );

  if (insertErr) return { error: insertErr.message };

  const { data: row } = await params.admin
    .from("autopilot_outputs")
    .select("id")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  const id = row?.id ?? outputId;
  const reportUrl = buildReportPublicUrl(appOrigin, id, "email");

  return { outputId: id, reportUrl };
}

export async function runAutopilotReport(params: {
  admin: SupabaseClient<Database>;
  testMode?: boolean;
  testUserId?: string | null;
  previewBrandId?: string | null;
  previewUserId?: string | null;
}): Promise<AutopilotReportRunSummary> {
  const summary: AutopilotReportRunSummary = {
    ok: true,
    mode: params.previewBrandId ? "preview" : params.testMode ? "test" : "production",
    generated: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const now = new Date();
  const utcDay = now.getUTCDate();
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";

  const lockOwner = await acquireAutopilotCronLock(params.admin, "autopilot-report");
  if (!lockOwner) {
    summary.ok = false;
    summary.errors.push("lock_not_acquired");
    return summary;
  }

  try {
    let settingsQuery = params.admin.from("autopilot_settings").select("*");

    if (params.previewBrandId && params.previewUserId) {
      settingsQuery = settingsQuery.eq("user_id", params.previewUserId);
    } else if (params.testMode && params.testUserId) {
      settingsQuery = settingsQuery.eq("user_id", params.testUserId);
    } else {
      settingsQuery = settingsQuery.eq("report_enabled", true).eq("enabled", true);
    }

    const { data: settingsRows, error: settingsErr } = await settingsQuery;
    if (settingsErr) {
      summary.ok = false;
      summary.errors.push(settingsErr.message);
      return summary;
    }

    for (const raw of settingsRows ?? []) {
      const userId = raw.user_id;
      const reportDay = raw.report_day_of_month ?? 1;
      const reportWorkspaces = parseReportWorkspaces(raw.report_workspaces);

      if (!params.previewBrandId && !params.testMode && reportDay !== utcDay) {
        // Off report day: only proceed when this month has a failed send that can still be retried.
        const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
        const { data: failedRows } = await params.admin
          .from("autopilot_outputs")
          .select("id, status, payload")
          .eq("user_id", userId)
          .eq("output_type", "monthly_report")
          .eq("status", "failed")
          .like("dedupe_key", `report:${userId}:%:${ym}`);
        const canRetry = (failedRows ?? []).some((row) => {
          const failedPayload = row.payload as { _meta?: { sendAttempts?: number } } | null;
          const attempts = failedPayload?._meta?.sendAttempts ?? 0;
          return attempts > 0 && attempts < MAX_REPORT_SEND_ATTEMPTS;
        });
        if (!canRetry) {
          summary.skipped += 1;
          continue;
        }
      }

      const billing = await getBillingEntitlement(params.admin, userId);
      if (!canUseReports(billing.planTier)) {
        summary.skipped += 1;
        continue;
      }

      const { data: brands } = await params.admin
        .from("brands")
        .select("id, name")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(billing.limits.maxOwnBrandWorkspaces);

      const brandList = brands ?? [];
      const targets = params.previewBrandId
        ? brandList.filter((b) => b.id === params.previewBrandId)
        : brandList.filter((b) => reportWorkspaces[b.id] !== false);

      for (const brand of targets) {
        const gen = await generateMonthlyReportForWorkspace({
          admin: params.admin,
          userId,
          brandId: brand.id,
          settings: { report_branding: parseReportBranding(raw.report_branding) },
          planTier: billing.planTier,
          preview: Boolean(params.previewBrandId),
          now,
        });

        if ("error" in gen) {
          summary.failed += 1;
          summary.errors.push(gen.error);
          continue;
        }

        if (!gen.reportUrl && !params.previewBrandId) {
          summary.skipped += 1;
          continue;
        }

        if (!("retrySendOnly" in gen && gen.retrySendOnly)) {
          summary.generated += 1;
        }

        if (params.previewBrandId) continue;

        const { data: outputRow } = await params.admin
          .from("autopilot_outputs")
          .select("payload")
          .eq("id", gen.outputId)
          .maybeSingle();

        const payload = outputRow?.payload as {
          summary?: { focusNextMonth?: string[]; executiveSummary?: string };
          brandName?: string;
          _meta?: { sendAttempts?: number };
        } | null;
        const prevAttempts = payload?._meta?.sendAttempts ?? 0;
        const bullets = payload?.summary
          ? reportEmailPreviewBullets({
              executiveSummary: payload.summary.executiveSummary ?? "",
              focusNextMonth: payload.summary.focusNextMonth ?? [],
            })
          : [];

        const reportUrl = gen.reportUrl || buildReportPublicUrl(appOrigin, gen.outputId, "email");
        const monthName = now.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });

        const { data: authUser } = await params.admin.auth.admin.getUserById(userId);
        const email = authUser.user?.email?.trim();
        const apiKey = getResendApiKey();

        if (!email || !apiKey) {
          summary.failed += 1;
          await params.admin
            .from("autopilot_outputs")
            .update({
              status: "failed",
              error: "email_not_available",
              payload: { ...payload, _meta: { sendAttempts: prevAttempts + 1 } },
            })
            .eq("id", gen.outputId);
          continue;
        }

        const resend = new Resend(apiKey);
        const bulletText = bullets.map((b) => `• ${b}`).join("\n");
        const { error: sendErr } = await resend.emails.send({
          from: getResendFromEmail(),
          to: email,
          subject: `Your ${monthName} competitor report for ${brand.name} is ready`,
          html: `<p>Your ${monthName} competitor report for <strong>${brand.name}</strong> is ready.</p>
<p>${bulletText.replace(/\n/g, "<br/>")}</p>
<p><a href="${reportUrl}">View report</a></p>`,
          text: `Your ${monthName} competitor report for ${brand.name} is ready.\n\n${bulletText}\n\nView report: ${reportUrl}`,
        });

        if (sendErr) {
          console.error("[autopilot-FAILED] report email", userId, sendErr.message);
          summary.failed += 1;
          const newAttempts = prevAttempts + 1;
          await params.admin
            .from("autopilot_outputs")
            .update({
              status: "failed",
              error: sendErr.message,
              payload: { ...payload, _meta: { sendAttempts: newAttempts } },
            })
            .eq("id", gen.outputId);
          continue;
        }

        const nowIso = new Date().toISOString();
        await params.admin
          .from("autopilot_outputs")
          .update({
            status: "sent",
            sent_at: nowIso,
            channels_sent: ["email"],
            error: null,
            payload: { ...payload, _meta: { sendAttempts: prevAttempts } },
          })
          .eq("id", gen.outputId);
        summary.sent += 1;
      }
    }

    console.info("[autopilot-report]", summary);
    return summary;
  } finally {
    await releaseAutopilotCronLock(params.admin, "autopilot-report", lockOwner);
  }
}
