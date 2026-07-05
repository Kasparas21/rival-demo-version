import type { CompetitorEmailRow } from "@/lib/email-intelligence/types";
import type { Database } from "@/lib/supabase/types";

export type SavedEmailRow = Database["public"]["Tables"]["saved_emails"]["Row"];

export function savedEmailToCompetitorRow(saved: SavedEmailRow): CompetitorEmailRow {
  return {
    id: saved.source_competitor_email_id ?? saved.id,
    tracker_id: "",
    user_id: saved.user_id,
    competitor_id: saved.competitor_id,
    from_email: saved.from_email,
    from_name: saved.from_name,
    subject: saved.subject,
    preview_text: saved.preview_text,
    html_body: saved.html_body,
    plain_text: saved.plain_text,
    received_at: saved.received_at ?? saved.saved_at,
    esp_detected: saved.esp_detected,
    email_type: saved.email_type,
    ai_summary: saved.ai_summary,
    ai_offers: saved.ai_offers,
    ai_cta: saved.ai_cta,
    ai_angle: saved.ai_angle,
    ai_processed_at: saved.saved_at,
    ai_analysis_error: null,
    ai_analysis_attempts: 0,
    ai_deep_analysis: saved.ai_deep_analysis,
    ai_analysis_version: saved.ai_analysis_version,
    created_at: saved.created_at,
  };
}

export function buildSavedEmailInsert(
  src: CompetitorEmailRow,
  userId: string,
  notes?: string | null,
): Database["public"]["Tables"]["saved_emails"]["Insert"] {
  return {
    user_id: userId,
    competitor_id: src.competitor_id,
    source_competitor_email_id: src.id,
    from_email: src.from_email,
    from_name: src.from_name,
    subject: src.subject,
    preview_text: src.preview_text,
    html_body: src.html_body,
    plain_text: src.plain_text,
    received_at: src.received_at,
    esp_detected: src.esp_detected,
    email_type: src.email_type,
    ai_summary: src.ai_summary,
    ai_offers: src.ai_offers as Database["public"]["Tables"]["saved_emails"]["Insert"]["ai_offers"],
    ai_cta: src.ai_cta,
    ai_angle: src.ai_angle,
    ai_deep_analysis:
      src.ai_deep_analysis as Database["public"]["Tables"]["saved_emails"]["Insert"]["ai_deep_analysis"],
    ai_analysis_version: src.ai_analysis_version,
    notes: notes != null ? notes.slice(0, 500) : null,
    saved_by_user_id: userId,
  };
}
