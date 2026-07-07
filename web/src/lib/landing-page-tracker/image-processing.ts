import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";

import {
  DIFF_REGION_MIN_AREA_PX,
  DIFF_REGION_PADDING_PX,
  HERO_CROP_HEIGHT_PX,
  type NormalizedRect,
} from "./constants";

export type PixelRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PixelDiffResult = {
  pct: number;
  changedPixels: number;
  totalPixels: number;
  maskOverlapPct: number;
};

export async function cropHeroPng(fullScreenshotBytes: Buffer): Promise<Buffer> {
  const meta = await sharp(fullScreenshotBytes).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const heroHeight = Math.min(HERO_CROP_HEIGHT_PX, height || HERO_CROP_HEIGHT_PX);

  return sharp(fullScreenshotBytes)
    .extract({ left: 0, top: 0, width: Math.max(width, 1), height: Math.max(heroHeight, 1) })
    .png()
    .toBuffer();
}

export async function cropRegionPng(
  fullScreenshotBytes: Buffer,
  rect: PixelRect,
): Promise<Buffer> {
  const meta = await sharp(fullScreenshotBytes).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const left = Math.max(0, Math.min(rect.x, width - 1));
  const top = Math.max(0, Math.min(rect.y, height - 1));
  const cropW = Math.max(1, Math.min(rect.w, width - left));
  const cropH = Math.max(1, Math.min(rect.h, height - top));

  return sharp(fullScreenshotBytes)
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toBuffer();
}

function loadPngRgb(bytes: Buffer): PNG {
  return PNG.sync.read(bytes);
}

async function resizePngToMatch(source: PNG, width: number, height: number): Promise<PNG> {
  const resized = await sharp(PNG.sync.write(source))
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();
  return PNG.sync.read(resized);
}

export function parseAnimationMask(raw: unknown): NormalizedRect[] {
  if (!Array.isArray(raw)) return [];
  const rects: NormalizedRect[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const x = Number(o.x);
    const y = Number(o.y);
    const w = Number(o.w);
    const h = Number(o.h);
    if ([x, y, w, h].every((v) => Number.isFinite(v)) && w > 0 && h > 0) {
      rects.push({ x, y, w, h });
    }
  }
  return rects;
}

function pixelInNormalizedRect(px: number, py: number, width: number, height: number, rect: NormalizedRect): boolean {
  const x0 = rect.x * width;
  const y0 = rect.y * height;
  const x1 = x0 + rect.w * width;
  const y1 = y0 + rect.h * height;
  return px >= x0 && px < x1 && py >= y0 && py < y1;
}

function isPixelMasked(px: number, py: number, width: number, height: number, mask: NormalizedRect[]): boolean {
  for (const rect of mask) {
    if (pixelInNormalizedRect(px, py, width, height, rect)) return true;
  }
  return false;
}

function computeDiffStats(
  imgA: PNG,
  imgB: PNG,
  mask: NormalizedRect[] = [],
): { changedPixels: number; totalPixels: number; maskOverlapPixels: number } {
  const { width, height } = imgA;
  const diff = new PNG({ width, height });
  const rawChanged = pixelmatch(imgA.data, imgB.data, diff.data, width, height, {
    threshold: 0.04,
    includeAA: false,
  });

  if (mask.length === 0) {
    return { changedPixels: rawChanged, totalPixels: width * height, maskOverlapPixels: 0 };
  }

  let changedOutsideMask = 0;
  let maskOverlapPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      const isChanged = diff.data[idx] === 255;
      if (!isChanged) continue;
      if (isPixelMasked(x, y, width, height, mask)) {
        maskOverlapPixels += 1;
      } else {
        changedOutsideMask += 1;
      }
    }
  }

  return {
    changedPixels: changedOutsideMask,
    totalPixels: width * height,
    maskOverlapPixels,
  };
}

/**
 * Compares two PNG screenshots pixel by pixel.
 * Returns percentage of pixels that changed (0.0 - 100.0).
 */
export async function calculatePixelDiff(imgBytesA: Buffer, imgBytesB: Buffer): Promise<number> {
  const result = await calculateMaskedPixelDiff(imgBytesA, imgBytesB, []);
  return result.pct;
}

export async function calculateMaskedPixelDiff(
  imgBytesA: Buffer,
  imgBytesB: Buffer,
  mask: NormalizedRect[] = [],
): Promise<PixelDiffResult> {
  let imgA = loadPngRgb(imgBytesA);
  let imgB = loadPngRgb(imgBytesB);

  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    imgB = await resizePngToMatch(imgB, imgA.width, imgA.height);
  }

  const stats = computeDiffStats(imgA, imgB, mask);
  const total = stats.totalPixels;
  const pct = total === 0 ? 0 : Math.round((stats.changedPixels / total) * 10000) / 100;
  const rawChanged = stats.changedPixels + stats.maskOverlapPixels;
  const maskOverlapPct =
    rawChanged === 0 ? 0 : Math.round((stats.maskOverlapPixels / rawChanged) * 10000) / 100;

  return {
    pct,
    changedPixels: stats.changedPixels,
    totalPixels: total,
    maskOverlapPct,
  };
}

function mergeRects(rects: PixelRect[]): PixelRect[] {
  if (rects.length <= 1) return rects;
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: PixelRect[] = [];

  for (const rect of sorted) {
    let absorbed = false;
    for (const existing of merged) {
      const overlapX = rect.x < existing.x + existing.w + 40 && rect.x + rect.w + 40 > existing.x;
      const overlapY = rect.y < existing.y + existing.h + 40 && rect.y + rect.h + 40 > existing.y;
      if (overlapX && overlapY) {
        const x2 = Math.max(existing.x + existing.w, rect.x + rect.w);
        const y2 = Math.max(existing.y + existing.h, rect.y + rect.h);
        existing.x = Math.min(existing.x, rect.x);
        existing.y = Math.min(existing.y, rect.y);
        existing.w = x2 - existing.x;
        existing.h = y2 - existing.y;
        absorbed = true;
        break;
      }
    }
    if (!absorbed) merged.push({ ...rect });
  }

  return merged;
}

function rectMostlyInMask(rect: PixelRect, width: number, height: number, mask: NormalizedRect[]): boolean {
  if (mask.length === 0) return false;
  let masked = 0;
  let total = 0;
  const step = Math.max(4, Math.floor(Math.min(rect.w, rect.h) / 8));
  for (let y = rect.y; y < rect.y + rect.h; y += step) {
    for (let x = rect.x; x < rect.x + rect.w; x += step) {
      total += 1;
      if (isPixelMasked(x, y, width, height, mask)) masked += 1;
    }
  }
  return total > 0 && masked / total >= 0.7;
}

function clusterChangedPixels(diff: PNG, mask: NormalizedRect[]): PixelRect[] {
  const { width, height } = diff;
  const cell = 48;
  const grid = new Map<string, { minX: number; minY: number; maxX: number; maxY: number; count: number }>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      if (diff.data[idx] !== 255) continue;
      if (isPixelMasked(x, y, width, height, mask)) continue;
      const key = `${Math.floor(x / cell)}:${Math.floor(y / cell)}`;
      const bucket = grid.get(key);
      if (bucket) {
        bucket.minX = Math.min(bucket.minX, x);
        bucket.minY = Math.min(bucket.minY, y);
        bucket.maxX = Math.max(bucket.maxX, x);
        bucket.maxY = Math.max(bucket.maxY, y);
        bucket.count += 1;
      } else {
        grid.set(key, { minX: x, minY: y, maxX: x, maxY: y, count: 1 });
      }
    }
  }

  const rects: PixelRect[] = [];
  for (const bucket of grid.values()) {
    if (bucket.count < 8) continue;
    rects.push({
      x: bucket.minX,
      y: bucket.minY,
      w: Math.max(1, bucket.maxX - bucket.minX + 1),
      h: Math.max(1, bucket.maxY - bucket.minY + 1),
    });
  }

  return mergeRects(rects);
}

export async function findDiffRegions(
  imgBytesA: Buffer,
  imgBytesB: Buffer,
  mask: NormalizedRect[] = [],
  maxRegions = 3,
): Promise<PixelRect[]> {
  let imgA = loadPngRgb(imgBytesA);
  let imgB = loadPngRgb(imgBytesB);

  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    imgB = await resizePngToMatch(imgB, imgA.width, imgA.height);
  }

  const { width, height } = imgA;
  const diff = new PNG({ width, height });
  pixelmatch(imgA.data, imgB.data, diff.data, width, height, {
    threshold: 0.04,
    includeAA: false,
  });

  const rects = clusterChangedPixels(diff, mask)
    .filter((r) => r.w * r.h >= DIFF_REGION_MIN_AREA_PX)
    .filter((r) => !rectMostlyInMask(r, width, height, mask))
    .sort((a, b) => b.w * b.h - a.w * a.h);

  return rects.slice(0, maxRegions).map((r) => ({
    x: Math.max(0, r.x - DIFF_REGION_PADDING_PX),
    y: Math.max(0, r.y - DIFF_REGION_PADDING_PX),
    w: Math.min(width - Math.max(0, r.x - DIFF_REGION_PADDING_PX), r.w + DIFF_REGION_PADDING_PX * 2),
    h: Math.min(height - Math.max(0, r.y - DIFF_REGION_PADDING_PX), r.h + DIFF_REGION_PADDING_PX * 2),
  }));
}

export async function buildAnimationMaskFromPair(
  imgBytesA: Buffer,
  imgBytesB: Buffer,
): Promise<NormalizedRect[]> {
  const regions = await findDiffRegions(imgBytesA, imgBytesB, [], 12);
  let imgA = loadPngRgb(imgBytesA);
  const width = imgA.width;
  const height = imgA.height;
  if (width === 0 || height === 0) return [];

  return regions.map((r) => ({
    x: r.x / width,
    y: r.y / height,
    w: r.w / width,
    h: r.h / height,
  }));
}

export async function sampleDominantColor(pngBytes: Buffer): Promise<string> {
  const { data, info } = await sharp(pngBytes)
    .resize(32, 32, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const a = info.channels === 4 ? data[i + 3] : 255;
    if (a < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 245 && g > 245 && b > 245) continue;
    rSum += r;
    gSum += g;
    bSum += b;
    count += 1;
  }

  if (count === 0) return "#000000";
  const r = Math.round(rSum / count);
  const g = Math.round(gSum / count);
  const b = Math.round(bSum / count);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Higher score = better capture (more content, taller page). */
export async function scoreScreenshotQuality(
  pngBytes: Buffer,
  referenceHeight?: number,
): Promise<number> {
  const meta = await sharp(pngBytes).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width === 0 || height === 0) return 0;

  const heroHeight = Math.min(HERO_CROP_HEIGHT_PX, height);
  const { data } = await sharp(pngBytes)
    .extract({ left: 0, top: 0, width, height: heroHeight })
    .resize(180, Math.max(1, Math.round((heroHeight / width) * 180)), { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then((r) => r);

  let nonWhite = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 250 || g < 250 || b < 250) nonWhite += 1;
  }
  const pixelScore = nonWhite / Math.max(1, data.length / 4);
  const heightScore = referenceHeight ? Math.min(1, height / referenceHeight) : Math.min(1, height / 4000);
  return pixelScore * 0.7 + heightScore * 0.3;
}

export function sectionLabelForY(y: number, pageHeight: number): string {
  if (pageHeight <= 0) return "content";
  const ratio = y / pageHeight;
  if (ratio < 0.25) return "hero";
  if (ratio < 0.55) return "content";
  if (ratio < 0.85) return "pricing";
  return "footer";
}

export function regionLabelForRect(rect: PixelRect, pageHeight: number): string {
  const section = sectionLabelForY(rect.y + rect.h / 2, pageHeight);
  if (section === "hero") return "Hero section";
  if (section === "pricing") return "Pricing section";
  if (section === "footer") return "Footer / social proof";
  return "Page section";
}
