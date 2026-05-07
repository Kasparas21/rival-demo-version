import type { AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { googleAdsExternalLinkLabel } from "@/lib/ad-library/normalize";

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

/**
 * Compact text digest of loaded Ads Library data for LLM grounding (no PII beyond public ad copy).
 */
export function buildAdEvidenceText(adLib: AdsLibraryResponse | null, maxTotalChars = 12_000): string {
  if (!adLib) return "";
  const blocks: string[] = [];

  const pushBlock = (title: string, lines: string[]) => {
    if (lines.length === 0) return;
    blocks.push(`${title} (${lines.length} lines):\n${lines.join("\n")}`);
  };

  const metaLines =
    adLib.meta.ads?.slice(0, 14).map((a) =>
      clip(
        [
          a.headline,
          a.desc,
          a.cta,
          a.isVideo ? "video" : "image",
        ]
          .filter(Boolean)
          .join(" | "),
        320
      )
    ) ?? [];
  if (adLib.meta.error) blocks.push(`meta error: ${adLib.meta.error}`);
  pushBlock("Meta / Facebook", metaLines);

  const googleLines: string[] = [];
  for (const row of adLib.google.rows?.slice(0, 14) ?? []) {
    if (row.type === "google") {
      const urlLine = row.url?.trim() ? googleAdsExternalLinkLabel(row.url).primary : "";
      const bits = [row.creativeCopy, row.title, row.desc, urlLine, row.advertiserName]
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      googleLines.push(clip(bits.join(" | "), 320));
    } else {
      const bits = [row.title, row.channel, row.views].filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0
      );
      googleLines.push(clip(bits.join(" | "), 320));
    }
  }
  if (adLib.google.error) blocks.push(`google error: ${adLib.google.error}`);
  pushBlock("Google / YouTube", googleLines);

  const liLines =
    adLib.linkedin.ads?.slice(0, 10).map((a) => clip([a.headline, a.desc].filter(Boolean).join(" | "), 300)) ?? [];
  if (adLib.linkedin.error) blocks.push(`linkedin error: ${adLib.linkedin.error}`);
  pushBlock("LinkedIn", liLines);

  const ttLines =
    adLib.tiktok.ads?.slice(0, 10).map((a) => clip([a.headline, a.desc].filter(Boolean).join(" | "), 300)) ?? [];
  if (adLib.tiktok.error) blocks.push(`tiktok error: ${adLib.tiktok.error}`);
  pushBlock("TikTok", ttLines);

  const msLines =
    adLib.microsoft.ads?.slice(0, 10).map((a) => clip([a.headline, a.desc].filter(Boolean).join(" | "), 300)) ?? [];
  if (adLib.microsoft.error) blocks.push(`microsoft error: ${adLib.microsoft.error}`);
  pushBlock("Microsoft", msLines);

  const pinLines =
    adLib.pinterest.ads?.slice(0, 10).map((a) => clip([a.headline, a.desc].filter(Boolean).join(" | "), 300)) ??
    [];
  if (adLib.pinterest.error) blocks.push(`pinterest error: ${adLib.pinterest.error}`);
  pushBlock("Pinterest", pinLines);

  const scLines =
    adLib.snapchat.ads?.slice(0, 10).map((a) => clip([a.headline, a.desc].filter(Boolean).join(" | "), 300)) ?? [];
  if (adLib.snapchat.error) blocks.push(`snapchat error: ${adLib.snapchat.error}`);
  pushBlock("Snapchat", scLines);

  let out = blocks.join("\n\n---\n\n").trim();
  if (out.length > maxTotalChars) out = `${out.slice(0, maxTotalChars - 20)}\n…(truncated)`;
  return out;
}
