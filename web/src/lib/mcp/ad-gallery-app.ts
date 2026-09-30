import { MCP_VISUALS_KEY, type McpImageContentBlock, fetchGalleryThumbnail } from "@/lib/mcp/ad-creative-media";

export const AD_GALLERY_UI_URI = "ui://spy-rival/ad-gallery-v3";
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
  /** Full-size creative the host can open outside the sandbox. */
  open_url?: string;
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
    openUrl?: string | null;
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
        ...(source.openUrl ? { open_url: source.openUrl } : {}),
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
  gallery?: Array<Omit<AdGalleryCard, "image_data" | "mime" | "vision_data" | "open_url">>;
  gallery_rendered_inline?: true;
  creative_vision_count?: number;
  [MCP_VISUALS_KEY]?: McpImageContentBlock[];
  [MCP_STRUCTURED_KEY]?: { ads: Array<Omit<AdGalleryCard, "vision_data">> };
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
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Rival ad creatives</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: transparent; }
  body {
    padding: 2px 0 8px;
    font: 14px/1.4 ui-sans-serif, system-ui, sans-serif;
    color: var(--color-text-primary, #18181b);
  }
  .list { display: flex; flex-direction: column; gap: 28px; width: 100%; }
  .item { margin: 0; width: 100%; }
  .stage {
    background: var(--color-background-secondary, #f4f4f5);
    border-radius: 22px;
    padding: 16px;
  }
  .stage img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 680px;
    object-fit: contain;
    border-radius: 14px;
    cursor: zoom-in;
    background: var(--color-background-primary, #fff);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
    padding: 0 4px;
  }
  .who {
    min-width: 0;
    font-size: 13px;
    font-weight: 650;
    color: var(--color-text-secondary, #3f3f46);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tools { display: flex; flex: none; gap: 8px; }
  button {
    appearance: none;
    border: 1px solid var(--color-border-secondary, rgba(0,0,0,0.12));
    background: var(--color-background-primary, #fff);
    color: var(--color-text-primary, #18181b);
    border-radius: 999px;
    height: 38px;
    padding: 0 14px;
    font: 600 13px/1 ui-sans-serif, system-ui, sans-serif;
    cursor: pointer;
  }
  button:hover { background: var(--color-background-secondary, #fafafa); }
  .badge {
    display: inline-block;
    margin-right: 6px;
    padding: 2px 6px;
    border-radius: 999px;
    background: #ccfbf1;
    color: #0f766e;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .empty { color: var(--color-text-secondary, #52525b); padding: 8px; }
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(9,9,11,0.94);
  }
  .lightbox img {
    flex: 1;
    min-height: 0;
    width: 100%;
    object-fit: contain;
  }
  .lightbox .tools { justify-content: flex-end; }
  .lightbox button { background: #fff; color: #18181b; }
  .toast {
    position: fixed;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%);
    z-index: 30;
    padding: 8px 14px;
    border-radius: 999px;
    background: #18181b;
    color: #fff;
    font-size: 12px;
    font-weight: 650;
  }
</style>
</head>
<body>
<div id="list" class="empty">Loading creatives…</div>
<script type="module">
  import { App } from "https://unpkg.com/@modelcontextprotocol/ext-apps@1.7.5/dist/src/app-with-deps.js";
  const list = document.getElementById("list");
  const app = new App(
    { name: "Rival ad gallery", version: "1.3.0" },
    { availableDisplayModes: ["inline", "fullscreen"] },
  );
  const urls = new Map();

  function adsFrom(result) {
    const structured = result && result.structuredContent && result.structuredContent.ads;
    return Array.isArray(structured) ? structured.filter((ad) => ad && ad.image_data) : [];
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
    setTimeout(() => el.remove(), 1800);
  }

  function hostWidth() {
    const ctx = typeof app.getHostContext === "function" ? app.getHostContext() : null;
    const dims = (ctx && ctx.containerDimensions) || {};
    const reported = dims.maxWidth || dims.width || 0;
    if (typeof reported === "number" && reported >= 520) return Math.min(Math.floor(reported), 960);
    return 760;
  }

  function publishSize() {
    const width = hostWidth();
    document.documentElement.style.width = width + "px";
    document.body.style.width = width + "px";
    const height = Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    if (typeof app.sendSizeChanged === "function") {
      app.sendSizeChanged({ width: width, height: height + 12 }).catch(() => {});
    }
  }

  async function copyImage(img) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob || !navigator.clipboard || !window.ClipboardItem) throw new Error("clipboard");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("Copied");
    } catch {
      toast("Copy was blocked in this chat");
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
              uri: "ui://spy-rival/ad-gallery-v3/" + encodeURIComponent(ad.id || name) + ".jpg",
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
    } catch { /* try the full file next */ }
    if (ad.open_url && typeof app.openLink === "function") {
      try {
        await app.openLink({ url: ad.open_url });
        toast("Opened the full creative");
        return;
      } catch { /* fall through */ }
    }
    toast("Download was blocked in this chat");
  }

  function closeLightbox() {
    const open = document.querySelector(".lightbox");
    if (open) open.remove();
    const ctx = typeof app.getHostContext === "function" ? app.getHostContext() : null;
    if (ctx && ctx.displayMode === "fullscreen" && typeof app.requestDisplayMode === "function") {
      app.requestDisplayMode({ mode: "inline" }).catch(() => {});
    }
    publishSize();
  }

  async function openLightbox(ad, img) {
    const existing = document.querySelector(".lightbox");
    if (existing) existing.remove();
    const ctx = typeof app.getHostContext === "function" ? app.getHostContext() : null;
    const modes = (ctx && ctx.availableDisplayModes) || [];
    if (modes.indexOf("fullscreen") !== -1 && typeof app.requestDisplayMode === "function") {
      try { await app.requestDisplayMode({ mode: "fullscreen" }); } catch { /* stay inline */ }
    }
    const box = document.createElement("div");
    box.className = "lightbox";
    const big = document.createElement("img");
    big.src = img.src;
    big.alt = img.alt || "Ad creative";
    const tools = document.createElement("div");
    tools.className = "tools";
    tools.append(
      button("Copy", () => copyImage(big)),
      button("Download", () => downloadImage(ad)),
      button("Close", closeLightbox),
    );
    box.append(big, tools);
    document.body.append(box);
    publishSize();
  }

  function button(label, onClick) {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = label;
    el.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return el;
  }

  function render(result) {
    const ads = adsFrom(result);
    list.className = "list";
    list.replaceChildren();
    if (!ads.length) {
      list.className = "empty";
      list.textContent = "No creative image was available for these ads.";
      publishSize();
      return;
    }
    for (const ad of ads) {
      let src = "";
      try { src = blobUrl(ad); } catch { continue; }
      const item = document.createElement("figure");
      item.className = "item";
      const stage = document.createElement("div");
      stage.className = "stage";
      const img = document.createElement("img");
      img.alt = ad.caption || ad.competitor || "Ad creative";
      img.src = src;
      img.addEventListener("load", publishSize);
      img.addEventListener("click", () => openLightbox(ad, img));
      stage.append(img);
      const row = document.createElement("div");
      row.className = "row";
      const who = document.createElement("div");
      who.className = "who";
      if (String(ad.format || "").toLowerCase() === "video") {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "Video";
        who.append(badge);
      }
      who.append(document.createTextNode(ad.competitor || "Ad"));
      const tools = document.createElement("div");
      tools.className = "tools";
      tools.append(
        button("Expand", () => openLightbox(ad, img)),
        button("Copy", () => copyImage(img)),
        button("Download", () => downloadImage(ad)),
      );
      row.append(who, tools);
      item.append(stage, row);
      list.append(item);
    }
    publishSize();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });

  app.ontoolresult = render;
  app.onhostcontextchanged = publishSize;
  await app.connect();
  publishSize();
</script>
</body>
</html>`;
}
