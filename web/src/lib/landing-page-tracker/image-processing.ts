import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";

import { HERO_CROP_HEIGHT_PX } from "./constants";

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

/**
 * Compares two PNG screenshots pixel by pixel.
 * Returns percentage of pixels that changed (0.0 - 100.0).
 */
export async function calculatePixelDiff(imgBytesA: Buffer, imgBytesB: Buffer): Promise<number> {
  let imgA = loadPngRgb(imgBytesA);
  let imgB = loadPngRgb(imgBytesB);

  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    imgB = await resizePngToMatch(imgB, imgA.width, imgA.height);
  }

  const { width, height } = imgA;
  const diff = new PNG({ width, height });
  const changedPixels = pixelmatch(imgA.data, imgB.data, diff.data, width, height, {
    threshold: 0.04,
    includeAA: false,
  });
  const totalPixels = width * height;
  if (totalPixels === 0) return 0;
  return Math.round((changedPixels / totalPixels) * 10000) / 100;
}
