/**
 * Seed demo competitor emails so Insights tab unlocks (5+ emails).
 * Usage: npx tsx scripts/seed-email-insights-demo.ts [competitor-slug]
 * Example: npx tsx scripts/seed-email-insights-demo.ts adidas.com
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createSupabaseAdminClient } from "../src/lib/supabase/admin";

const DEMO_EMAILS = [
  {
    resend_inbound_id: "demo-seed-001",
    subject: "🔥 30% off Ultraboost — ends tonight",
    preview_text: "Last chance to save on running favorites.",
    plain_text: "Your exclusive member offer expires at midnight. Shop Ultraboost and more.",
    received_at: "2026-06-20T10:00:00.000Z",
    email_type: "promotional",
    ai_summary:
      "Urgency-driven promo pushing Ultraboost with a time-limited 30% discount for adiClub members.",
    ai_offers: [{ type: "discount", value: "30% off Ultraboost", code: "RUN30" }],
    ai_cta: "Shop now",
    ai_angle: "urgency",
  },
  {
    resend_inbound_id: "demo-seed-002",
    subject: "New arrivals: Summer training collection",
    preview_text: "Fresh picks for your warm-weather workouts.",
    plain_text: "Discover lightweight layers and training shoes built for summer sessions.",
    received_at: "2026-06-18T14:30:00.000Z",
    email_type: "newsletter",
    ai_summary:
      "Seasonal product launch email highlighting new summer training gear without a hard discount.",
    ai_offers: [],
    ai_cta: "Explore collection",
    ai_angle: "curiosity",
  },
  {
    resend_inbound_id: "demo-seed-003",
    subject: "You left something behind 👟",
    preview_text: "Your cart is waiting — free shipping included.",
    plain_text: "Complete your order today and get free shipping on your saved items.",
    received_at: "2026-06-15T09:15:00.000Z",
    email_type: "cart_abandonment",
    ai_summary: "Cart abandonment reminder with free shipping incentive to recover the purchase.",
    ai_offers: [{ type: "free_shipping", value: "Free shipping", code: null }],
    ai_cta: "Complete your order",
    ai_angle: "value",
  },
  {
    resend_inbound_id: "demo-seed-004",
    subject: "Members get early access to the Samba drop",
    preview_text: "Be first in line for the restock.",
    plain_text: "adiClub members can shop the Samba restock 24 hours before everyone else.",
    received_at: "2026-06-12T16:45:00.000Z",
    email_type: "promotional",
    ai_summary:
      "Exclusivity email offering early access to a high-demand Samba restock for loyalty members.",
    ai_offers: [{ type: "other", value: "Early access", code: null }],
    ai_cta: "Shop early access",
    ai_angle: "scarcity",
  },
  {
    resend_inbound_id: "demo-seed-005",
    subject: "See what 2M runners are wearing this week",
    preview_text: "Trending styles picked by the community.",
    plain_text: "Join millions of runners and shop the most popular styles this week.",
    received_at: "2026-06-10T11:00:00.000Z",
    email_type: "nurture",
    ai_summary: "Social proof email showcasing trending products backed by community popularity.",
    ai_offers: [],
    ai_cta: "Shop trending",
    ai_angle: "social_proof",
  },
];

async function main() {
  const admin = createSupabaseAdminClient();
  const arg = process.argv[2]?.trim() || "adidas.com";

  let competitor: { id: string; user_id: string; name: string; slug: string } | null = null;
  let trackerId: string | null = null;

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidRe.test(arg)) {
    const { data: row } = await admin
      .from("competitor_email_trackers")
      .select("id, user_id, competitor_id")
      .eq("competitor_id", arg)
      .maybeSingle();
    if (row) {
      trackerId = row.id;
      const { data: sc } = await admin
        .from("saved_competitors")
        .select("name, slug")
        .eq("id", row.competitor_id)
        .maybeSingle();
      if (sc) {
        competitor = {
          id: row.competitor_id,
          user_id: row.user_id,
          name: sc.name,
          slug: sc.slug,
        };
      }
    }
  } else {
    const { data: sc } = await admin
      .from("saved_competitors")
      .select("id, user_id, name, slug")
      .eq("slug", arg)
      .maybeSingle();
    if (sc) {
      const { data: row } = await admin
        .from("competitor_email_trackers")
        .select("id")
        .eq("competitor_id", sc.id)
        .maybeSingle();
      if (row) {
        trackerId = row.id;
        competitor = {
          id: sc.id,
          user_id: sc.user_id,
          name: sc.name,
          slug: sc.slug,
        };
      }
    }
  }

  if (!competitor || !trackerId) {
    console.error(
      `No tracked competitor found for "${arg}". Pass a slug with an active tracker or a competitor UUID.`,
    );
    process.exit(1);
  }

  const tracker = { id: trackerId };

  const prefix = `demo-${competitor.id.slice(0, 8)}`;
  let inserted = 0;

  for (const demo of DEMO_EMAILS) {
    const resendId = `${prefix}-${demo.resend_inbound_id}`;
    const { data: existing } = await admin
      .from("competitor_emails")
      .select("id")
      .eq("resend_inbound_id", resendId)
      .maybeSingle();

    if (existing) {
      console.log("Skip (exists):", demo.subject);
      continue;
    }

    const { error } = await admin.from("competitor_emails").insert({
        tracker_id: tracker.id,
        user_id: competitor.user_id,
        competitor_id: competitor.id,
        resend_inbound_id: resendId,
        from_email: "news@link.adidas.com",
        from_name: competitor.name,
        subject: demo.subject,
        preview_text: demo.preview_text,
        plain_text: demo.plain_text,
        html_body: null,
        received_at: demo.received_at,
        esp_detected: "Klaviyo",
        email_type: demo.email_type,
        ai_summary: demo.ai_summary,
        ai_offers: demo.ai_offers,
        ai_cta: demo.ai_cta,
        ai_angle: demo.ai_angle,
        ai_processed_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Insert failed:", demo.subject, error.message);
    } else {
      inserted += 1;
    }
  }

  const { count } = await admin
    .from("competitor_emails")
    .select("id", { count: "exact", head: true })
    .eq("competitor_id", competitor.id);

  console.log(
    `Done. Seeded ${inserted} demo emails for ${competitor.name} (${competitor.slug}). Total emails: ${count ?? "?"}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
