export const AD_GALLERY_UI_URI = "ui://spy-rival/ad-gallery";
export const MCP_AD_GALLERY_MIME = "text/html;profile=mcp-app";
export const MCP_STRUCTURED_KEY = "_mcpStructuredContent";
export const MCP_AD_GALLERY_MAX = 12;

export const AD_GALLERY_TOOL_META = {
  ui: { resourceUri: AD_GALLERY_UI_URI },
  "ui/resourceUri": AD_GALLERY_UI_URI,
} as const;

export type AdGalleryCard = {
  id: string;
  competitor: string;
  caption: string;
  format: string;
  image_url: string;
};

export function galleryCaption(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, 90);
}

export function attachAdGallery<T extends Record<string, unknown>>(
  payload: T,
  cards: AdGalleryCard[],
): T & { gallery?: AdGalleryCard[]; gallery_rendered_inline?: true; [MCP_STRUCTURED_KEY]?: { title: string; ads: AdGalleryCard[] } } {
  const ads = cards.filter((card) => card.image_url.trim()).slice(0, MCP_AD_GALLERY_MAX);
  if (!ads.length) return payload;
  return {
    ...payload,
    gallery: ads,
    gallery_rendered_inline: true,
    [MCP_STRUCTURED_KEY]: { title: "Ad creatives", ads },
  };
}

/** Inline gallery Claude renders in the conversation, like other MCP app media viewers. */
export function adGalleryHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light dark">
<title>Rival ad creatives</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 13px/1.35 ui-sans-serif, system-ui, sans-serif;
    color: var(--color-text-primary, #1a1a1a);
    background: transparent;
  }
  h2 { margin: 0 0 10px; font-size: 13px; font-weight: 650; letter-spacing: 0.01em; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 10px;
  }
  .card {
    margin: 0;
    border: 1px solid var(--color-border-secondary, rgba(0,0,0,0.08));
    border-radius: 14px;
    overflow: hidden;
    background: var(--color-background-secondary, #fff);
  }
  .card img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; background: #f3f4f6; }
  figcaption { padding: 8px 10px 10px; }
  .who { font-weight: 650; font-size: 12px; }
  .cap { margin-top: 2px; color: var(--color-text-secondary, #52525b); font-size: 11px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .badge { display: inline-block; margin-top: 4px; font-size: 10px; font-weight: 650; letter-spacing: 0.04em; text-transform: uppercase; color: #0f766e; }
  .empty { color: var(--color-text-secondary, #52525b); }
</style>
</head>
<body>
<h2>Ad creatives</h2>
<div id="grid" class="empty">Loading creatives…</div>
<script type="module">
  import { App } from "https://unpkg.com/@modelcontextprotocol/ext-apps@1.7.5/dist/src/app-with-deps.js";
  const grid = document.getElementById("grid");
  function adsFrom(result) {
    const structured = result && result.structuredContent && result.structuredContent.ads;
    if (Array.isArray(structured) && structured.length) return structured;
    const blocks = (result && result.content) || [];
    for (const block of blocks) {
      if (!block || block.type !== "text" || typeof block.text !== "string") continue;
      try {
        const parsed = JSON.parse(block.text);
        if (Array.isArray(parsed.gallery) && parsed.gallery.length) return parsed.gallery;
      } catch { /* ignore */ }
    }
    return [];
  }
  function render(result) {
    const ads = adsFrom(result);
    grid.className = "grid";
    grid.replaceChildren();
    if (!ads.length) {
      grid.className = "empty";
      grid.textContent = "No creative image was available for these ads.";
      return;
    }
    for (const ad of ads) {
      const fig = document.createElement("figure");
      fig.className = "card";
      const img = document.createElement("img");
      img.alt = ad.caption || ad.competitor || "Ad creative";
      img.src = ad.image_url;
      img.addEventListener("error", () => fig.remove());
      const cap = document.createElement("figcaption");
      const who = document.createElement("div");
      who.className = "who";
      who.textContent = ad.competitor || "Ad";
      const text = document.createElement("div");
      text.className = "cap";
      text.textContent = ad.caption || "";
      cap.append(who, text);
      if (String(ad.format || "").toLowerCase() === "video") {
        const badge = document.createElement("div");
        badge.className = "badge";
        badge.textContent = "Video";
        cap.append(badge);
      }
      fig.append(img, cap);
      grid.append(fig);
    }
  }
  const app = new App({ name: "Rival ad gallery", version: "1.0.0" });
  app.ontoolresult = render;
  await app.connect();
</script>
</body>
</html>`;
}
