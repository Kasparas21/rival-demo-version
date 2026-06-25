export type DetectedEsp =
  | "Klaviyo"
  | "Mailchimp"
  | "HubSpot"
  | "Brevo"
  | "ActiveCampaign"
  | "Unknown";

/** Heuristic ESP sniff from HTML body (case-insensitive). */
export function detectEspFromHtml(html: string | null | undefined): DetectedEsp {
  const hay = (html ?? "").toLowerCase();
  if (!hay) return "Unknown";
  if (hay.includes("klaviyo.com") || hay.includes("klaviyomail.com")) return "Klaviyo";
  if (hay.includes("mailchimp.com") || hay.includes("list-manage.com")) return "Mailchimp";
  if (hay.includes("hubspot.com")) return "HubSpot";
  if (hay.includes("brevo.com") || hay.includes("sendinblue.com")) return "Brevo";
  if (hay.includes("activecampaign.com")) return "ActiveCampaign";
  return "Unknown";
}
