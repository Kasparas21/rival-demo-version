#!/usr/bin/env bash
# Optimize the "Rival in the wild" review photos in place.
#
# 1. Save your three photos into web/public/landing/reviews/usage/ as:
#      usage-1.jpg   (Autopilot settings modal)
#      usage-2.jpg   (dashboard / scraped creatives)
#      usage-3.jpg   (Strategy Map)
#    (Any JPG/PNG/HEIC works — just name them usage-1/2/3 with the right extension.)
#
# 2. Run:  bash web/scripts/optimize-usage-photos.sh
#
# Downscales each to a max long-edge of 1600px and recompresses to JPEG q72,
# turning multi-MB phone photos into ~150–300KB files. next/image then serves
# right-sized WebP/AVIF to browsers, lazily, below the fold.
set -euo pipefail

DIR="$(cd "$(dirname "$0")/../public/landing/reviews/usage" && pwd)"
echo "Optimizing photos in: $DIR"

shopt -s nullglob
found=0
for f in "$DIR"/usage-1.* "$DIR"/usage-2.* "$DIR"/usage-3.*; do
  found=1
  before=$(stat -f%z "$f")
  # Resample longest side to <=1600px, re-encode as JPEG q72, overwrite as .jpg
  base="${f%.*}"
  sips -Z 1600 -s format jpeg -s formatOptions 72 "$f" --out "$base.jpg" >/dev/null
  # If the source was not already .jpg, remove the original
  [ "$f" != "$base.jpg" ] && rm -f "$f"
  after=$(stat -f%z "$base.jpg")
  printf "  %-14s %6s KB -> %5s KB\n" "$(basename "$base.jpg")" "$((before/1024))" "$((after/1024))"
done

if [ "$found" -eq 0 ]; then
  echo "No usage-1/2/3 files found yet. Save the three photos there first."
  exit 1
fi
echo "Done. Hard-refresh the landing page to see them."
