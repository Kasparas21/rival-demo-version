import type { VisualChangeRegion } from "./constants";
import {
  cropRegionPng,
  findDiffRegions,
  regionLabelForRect,
  sampleDominantColor,
  type PixelRect,
} from "./image-processing";
import { buildScreenshotPath, uploadScreenshot } from "./upload-screenshot";
import type { NormalizedRect } from "./constants";

function colorsDiffer(a: string, b: string): boolean {
  return a.toLowerCase() !== b.toLowerCase();
}

export async function buildVisualChangeRegions(params: {
  prevFullBytes: Buffer;
  newFullBytes: Buffer;
  mask: NormalizedRect[];
  userId: string;
  competitorId: string;
  label: string;
  timestamp: string;
}): Promise<VisualChangeRegion[]> {
  const { prevFullBytes, newFullBytes, mask, userId, competitorId, label, timestamp } = params;
  const sharp = (await import("sharp")).default;
  const meta = await sharp(newFullBytes).metadata();
  const pageHeight = meta.height ?? 0;

  const regions = await findDiffRegions(prevFullBytes, newFullBytes, mask, 3);
  const visualChanges: VisualChangeRegion[] = [];

  for (let i = 0; i < regions.length; i++) {
    const rect: PixelRect = regions[i];
    const [beforeCrop, afterCrop] = await Promise.all([
      cropRegionPng(prevFullBytes, rect),
      cropRegionPng(newFullBytes, rect),
    ]);

    const [beforeColor, afterColor] = await Promise.all([
      sampleDominantColor(beforeCrop),
      sampleDominantColor(afterCrop),
    ]);

    const regionLabel = regionLabelForRect(rect, pageHeight);
    const id = `region_${i + 1}`;
    const section = regionLabel.toLowerCase().includes("hero")
      ? "hero"
      : regionLabel.toLowerCase().includes("pricing")
        ? "pricing"
        : regionLabel.toLowerCase().includes("footer")
          ? "footer"
          : "content";

    const beforePath = buildScreenshotPath({
      userId,
      competitorId,
      label,
      timestamp,
      variant: `diff_before_${id}`,
    });
    const afterPath = buildScreenshotPath({
      userId,
      competitorId,
      label,
      timestamp,
      variant: `diff_after_${id}`,
    });

    const [before_crop_url, after_crop_url] = await Promise.all([
      uploadScreenshot(beforeCrop, beforePath),
      uploadScreenshot(afterCrop, afterPath),
    ]);

    visualChanges.push({
      id,
      label: regionLabel,
      section,
      before_crop_url,
      after_crop_url,
      before_color: beforeColor,
      after_color: afterColor,
      color_changed: colorsDiffer(beforeColor, afterColor),
    });
  }

  return visualChanges;
}
