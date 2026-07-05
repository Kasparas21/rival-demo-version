import { z } from "zod";

export const watchSensitivitySchema = z.enum(["paranoid", "balanced", "big_moves"]);

export const watchChannelsSchema = z.object({
  email: z.boolean(),
  slack: z.boolean(),
  discord: z.boolean().optional(),
});

export const watchQuietHoursSchema = z.object({
  start: z.number().int().min(0).max(23),
  end: z.number().int().min(0).max(23),
  timezone: z.string().min(1).max(120),
});

export const reportBrandingSchema = z.object({
  logo_url: z.string().url().nullable().optional(),
  agency_name: z.string().max(120).nullable().optional(),
  accent_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  hide_powered_by: z.boolean().optional(),
});

export const autopilotSettingsPutSchema = z.object({
  enabled: z.boolean().optional(),
  watch_enabled: z.boolean().optional(),
  watch_sensitivity: watchSensitivitySchema.optional(),
  watch_min_score: z.union([z.literal(6), z.literal(8), z.literal(9), z.literal(10)]).nullable().optional(),
  watch_channels: watchChannelsSchema.optional(),
  slack_webhook_url: z.string().url().nullable().optional(),
  slack_connection: z.null().optional(),
  watch_competitor_ids: z.array(z.string().uuid()).nullable().optional(),
  watch_quiet_hours: watchQuietHoursSchema.optional(),
  report_enabled: z.boolean().optional(),
  report_day_of_month: z.number().int().min(1).max(28).optional(),
  report_branding: reportBrandingSchema.optional(),
  report_workspaces: z.record(z.string().uuid(), z.boolean()).optional(),
  brief_enabled: z.boolean().optional(),
});

export type AutopilotSettingsPut = z.infer<typeof autopilotSettingsPutSchema>;

export const reportPreviewSchema = z.object({
  brandId: z.string().uuid(),
});
