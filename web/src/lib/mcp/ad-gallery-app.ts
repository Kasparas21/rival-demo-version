import { MCP_VISUALS_KEY, type McpImageContentBlock, fetchGalleryThumbnail } from "@/lib/mcp/ad-creative-media";

export const AD_GALLERY_UI_URI = "ui://spy-rival/ad-gallery";
export const MCP_AD_GALLERY_MIME = "text/html;profile=mcp-app";
export const MCP_STRUCTURED_KEY = "_mcpStructuredContent";
export const MCP_AD_GALLERY_MAX = 8;

export const AD_GALLERY_TOOL_META = {
  ui: { resourceUri: AD_GALLERY_UI_URI },
  "ui/resourceUri": AD_GALLERY_UI_URI,
} as const;

export type AdGalleryCard = {
  id: string;
  competitor: string;
  caption: string;
  format: string;
  /** Base64 JPEG drawn in the chat widget. */
  image_data: string;
  /** Base64 JPEG for the model. Omitted from the widget payload. */
  vision_data?: string;
  mime: "image/jpeg";
};

export function galleryCaption(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
}

function displayBudget(count: number): number {
  if (count <= 1) return 48_000;
  if (count <= 3) return 24_000;
  return 14_000;
}

export async function loadGalleryCards(
  sources: Array<{
    id: string;
    competitor: string;
    caption: string;
    format: string;
    sourceUrls: Array<string | null | undefined>;
  }>,
): Promise<AdGalleryCard[]> {
  const slice = sources.slice(0, MCP_AD_GALLERY_MAX);
  const displayMaxBytes = displayBudget(slice.length);
  const visionSlots = slice.length <= 1 ? 1 : 3;
  const cards = await Promise.all(
    slice.map(async (source, index) => {
      const thumb = await fetchGalleryThumbnail(source.sourceUrls, {
        displayMaxBytes,
        includeVision: index < visionSlots,
      });
      if (!thumb) return null;
      return {
        id: source.id,
        competitor: source.competitor,
        caption: source.caption,
        format: source.format,
        image_data: thumb.data,
        ...(thumb.vision ? { vision_data: thumb.vision } : {}),
        mime: thumb.mime,
      } satisfies AdGalleryCard;
    }),
  );
  return cards.filter((card): card is AdGalleryCard => Boolean(card));
}

export function attachAdGallery<T extends Record<string, unknown>>(
  payload: T,
  cards: AdGalleryCard[],
): T & {
  gallery?: Array<Omit<AdGalleryCard, "image_data" | "mime" | "vision_data">>;
  gallery_rendered_inline?: true;
  creative_vision_count?: number;
  [MCP_VISUALS_KEY]?: McpImageContentBlock[];
  [MCP_STRUCTURED_KEY]?: { title: string; ads: Array<Omit<AdGalleryCard, "vision_data">> };
} {
  const ads = cards.filter((card) => card.image_data.trim()).slice(0, MCP_AD_GALLERY_MAX);
  if (!ads.length) return payload;
  const visuals: McpImageContentBlock[] = ads
    .filter((card) => card.vision_data?.trim())
    .map((card) => ({
      type: "image",
      data: card.vision_data as string,
      mimeType: "image/jpeg",
      annotations: { audience: ["assistant"] },
    }));
  return {
    ...payload,
    gallery: ads.map(({ id, competitor, caption, format }) => ({ id, competitor, caption, format })),
    gallery_rendered_inline: true,
    creative_vision_count: visuals.length,
    ...(visuals.length
      ? {
          creative_vision:
            "Assistant-only image blocks on this tool result are the creatives, in the same order as gallery. " +
            "Look at those pixels and describe what is actually in each picture: objects, on-image text, colors, layout, and offer. " +
            "The user already sees them in the gallery and can expand, copy, and download each one.",
        }
      : {}),
    ...(visuals.length ? { [MCP_VISUALS_KEY]: visuals } : {}),
    [MCP_STRUCTURED_KEY]: {
      title: "Ad creatives",
      ads: ads.map(({ vision_data: _vision, ...card }) => card),
    },
  };
}

/** Inline gallery Claude renders in the conversation, like other MCP app media viewers. */
export function adGalleryHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light dark">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rival ad creatives</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 100%; }
  body {
    padding: 8px 4px 12px;
    font: 14px/1.4 ui-sans-serif, system-ui, sans-serif;
    color: var(--color-text-primary, #18181b);
    background: transparent;
  }
  .grid {
    display: grid;
    gap: 20px;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  }
  .card {
    margin: 0;
    border-radius: 22px;
    overflow: hidden;
    background: var(--color-background-primary, #fff);
    border: 1px solid var(--color-border-secondary, rgba(0,0,0,0.08));
    box-shadow: 0 10px 32px rgba(0,0,0,0.06);
  }
  .frame {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 240px;
    padding: 16px;
    background:
      radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.08), transparent 55%),
      #161616;
  }
  .grid.single .frame { min-height: 380px; padding: 22px 22px 18px; }
  .frame img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 520px;
    object-fit: contain;
    border-radius: 14px;
    background: #0e0e0e;
    box-shadow: 0 16px 40px rgba(0,0,0,0.35);
    cursor: zoom-in;
  }
  .grid.single .frame img { max-height: 640px; }
  .actions {
    position: absolute;
    right: 14px;
    bottom: 14px;
    display: flex;
    gap: 8px;
  }
  .actions button, .bar button {
    border: 0;
    border-radius: 999px;
    height: 34px;
    padding: 0 12px;
    font: 600 12px/1 ui-sans-serif, system-ui, sans-serif;
    letter-spacing: 0.01em;
    color: #18181b;
    background: rgba(255,255,255,0.94);
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    cursor: pointer;
  }
  .actions button:hover, .bar button:hover { background: #fff; }
  figcaption { padding: 14px 16px 16px; }
  .who { font-weight: 650; font-size: 14px; }
  .cap {
    margin-top: 4px;
    color: var(--color-text-secondary, #52525b);
    font-size: 13px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .badge {
    position: absolute;
    left: 14px;
    top: 14px;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.92);
    color: #0f766e;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .empty { color: var(--color-text-secondary, #52525b); padding: 8px; }
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    background: rgba(8,8,8,0.94);
    padding: 12px 12px 16px;
  }
  .lightbox img {
    flex: 1;
    min-height: 0;
    width: 100%;
    object-fit: contain;
    border-radius: 12px;
  }
  .bar {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 4px 0;
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    z-index: 40;
    padding: 8px 14px;
    border-radius: 999px;
    background: #18181b;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
  }
</style>
</head>
<body>
<div id="grid" class="empty">Loading creatives…</div>
<script type="module">
  import { App } from "https://unpkg.com/@modelcontextprotocol/ext-apps@1.7.5/dist/src/app-with-deps.js";
  const grid = document.getElementById("grid");
  const app = new App(
    { name: "Rival ad gallery", version: "1.1.0" },
    { availableDisplayModes: ["inline", "fullscreen"] },
  );
  const urls = new Map();

  function adsFrom(result) {
    const structured = result && result.structuredContent && result.structuredContent.ads;
    if (Array.isArray(structured) && structured.length) return structured;
    return [];
  }

  function bytesOf(ad) {
    const binary = atob(ad.image_data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function blobUrl(ad) {
    const cached = urls.get(ad.id);
    if (cached) return cached;
    const url = URL.createObjectURL(new Blob([bytesOf(ad)], { type: ad.mime || "image/jpeg" }));
    urls.set(ad.id, url);
    return url;
  }

  function fileName(ad) {
    const who = String(ad.competitor || "ad").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return (who || "ad") + "-creative.jpg";
  }

  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.append(el);
    setTimeout(() => el.remove(), 1600);
  }

  async function copyImage(img) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob || !navigator.clipboard || !window.ClipboardItem) throw new Error("clipboard");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("Copied");
    } catch {
      toast("Couldn’t copy — use Download");
    }
  }

  async function downloadImage(ad) {
    const name = fileName(ad);
    try {
      if (typeof app.downloadFile === "function") {
        const result = await app.downloadFile({
          contents: [{
            type: "resource",
            resource: {
              uri: "ui://spy-rival/ad-gallery/" + encodeURIComponent(ad.id || name) + ".jpg",
              mimeType: "image/jpeg",
              blob: ad.image_data,
            },
          }],
        });
        if (!result || !result.isError) {
          toast("Download started");
          return;
        }
      }
    } catch { /* fall through */ }
    const link = document.createElement("a");
    link.href = blobUrl(ad);
    link.download = name;
    link.click();
    toast("Download started");
  }

  function closeLightbox() {
    const open = document.querySelector(".lightbox");
    if (open) open.remove();
    const ctx = app.getHostContext ? app.getHostContext() : null;
    if (ctx && ctx.displayMode === "fullscreen" && typeof app.requestDisplayMode === "function") {
      app.requestDisplayMode({ mode: "inline" }).catch(() => {});
    }
  }

  async function openLightbox(ad, img) {
    closeLightbox();
    const ctx = app.getHostContext ? app.getHostContext() : null;
    const modes = (ctx && ctx.availableDisplayModes) || [];
    if (modes.indexOf("fullscreen") !== -1 && typeof app.requestDisplayMode === "function") {
      try { await app.requestDisplayMode({ mode: "fullscreen" }); } catch { /* overlay still works */ }
    }
    const box = document.createElement("div");
    box.className = "lightbox";
    const big = document.createElement("img");
    big.src = img.src;
    big.alt = img.alt;
    const bar = document.createElement("div");
    bar.className = "bar";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", () => copyImage(big));
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Download";
    save.addEventListener("click", () => downloadImage(ad));
    const done = document.createElement("button");
    done.type = "button";
    done.textContent = "Close";
    done.addEventListener("click", closeLightbox);
    bar.append(copy, save, done);
    box.append(big, bar);
    box.addEventListener("click", (event) => {
      if (event.target === box) closeLightbox();
    });
    document.body.append(box);
  }

  function actionButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function render(result) {
    const ads = adsFrom(result).filter((ad) => ad && ad.image_data);
    grid.className = ads.length === 1 ? "grid single" : "grid";
    grid.replaceChildren();
    if (!ads.length) {
      grid.className = "empty";
      grid.textContent = "No creative image was available for these ads.";
      return;
    }
    for (const ad of ads) {
      let src = "";
      try { src = blobUrl(ad); } catch { continue; }
      const fig = document.createElement("figure");
      fig.className = "card";
      const frame = document.createElement("div");
      frame.className = "frame";
      const img = document.createElement("img");
      img.alt = ad.caption || ad.competitor || "Ad creative";
      img.src = src;
      img.addEventListener("error", () => fig.remove());
      img.addEventListener("click", () => openLightbox(ad, img));
      const actions = document.createElement("div");
      actions.className = "actions";
      actions.append(
        actionButton("Expand", () => openLightbox(ad, img)),
        actionButton("Copy", () => copyImage(img)),
        actionButton("Download", () => downloadImage(ad)),
      );
      frame.append(img, actions);
      if (String(ad.format || "").toLowerCase() === "video") {
        const badge = document.createElement("div");
        badge.className = "badge";
        badge.textContent = "Video";
        frame.append(badge);
      }
      const cap = document.createElement("figcaption");
      const who = document.createElement("div");
      who.className = "who";
      who.textContent = ad.competitor || "Ad";
      const text = document.createElement("div");
      text.className = "cap";
      text.textContent = ad.caption || "";
      cap.append(who);
      if (ad.caption) cap.append(text);
      fig.append(frame, cap);
      grid.append(fig);
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });

  app.ontoolresult = render;
  await app.connect();
</script>
</body>
</html>`;
}
