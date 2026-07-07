import {
  SECTION_TILE_DIFF_THRESHOLD_PCT,
  SECTION_TILE_HEIGHT_PX,
  SECTION_TILE_OVERLAP_PX,
  type NormalizedRect,
} from "./constants";
import { calculateMaskedPixelDiff, cropRegionPng, type PixelRect } from "./image-processing";

export type SectionTile = {
  index: number;
  top: number;
  height: number;
  diffPct: number;
  beforeCrop: Buffer;
  afterCrop: Buffer;
};

export async function selectChangedSectionTiles(params: {
  prevFullBytes: Buffer;
  newFullBytes: Buffer;
  mask: NormalizedRect[];
  maxTiles?: number;
}): Promise<SectionTile[]> {
  const { prevFullBytes, newFullBytes, mask, maxTiles = 2 } = params;
  const sharp = (await import("sharp")).default;
  const prevMeta = await sharp(prevFullBytes).metadata();
  const newMeta = await sharp(newFullBytes).metadata();
  const width = Math.max(prevMeta.width ?? 0, newMeta.width ?? 0);
  const height = Math.max(prevMeta.height ?? 0, newMeta.height ?? 0);
  if (width === 0 || height === 0) return [];

  const tiles: SectionTile[] = [];
  let index = 0;

  for (let top = 0; top < height; top += SECTION_TILE_HEIGHT_PX - SECTION_TILE_OVERLAP_PX) {
    const tileHeight = Math.min(SECTION_TILE_HEIGHT_PX, height - top);
    if (tileHeight < 200) break;

    const rect: PixelRect = { x: 0, y: top, w: width, h: tileHeight };
    const [beforeCrop, afterCrop] = await Promise.all([
      cropRegionPng(prevFullBytes, rect),
      cropRegionPng(newFullBytes, rect),
    ]);

    const diff = await calculateMaskedPixelDiff(beforeCrop, afterCrop, mask);
    if (diff.pct >= SECTION_TILE_DIFF_THRESHOLD_PCT) {
      tiles.push({
        index,
        top,
        height: tileHeight,
        diffPct: diff.pct,
        beforeCrop,
        afterCrop,
      });
    }
    index += 1;
  }

  return tiles.sort((a, b) => b.diffPct - a.diffPct).slice(0, maxTiles);
}
