import { adDetailPayloadFromSeed, isFullAdDetailPayload } from "@/lib/ad-detail/ad-detail-from-seed";
import { getAdDetailSeed, getCachedAdDetail } from "@/lib/ad-detail/ad-detail-cache";
import type { AdDetailData } from "@/lib/ad-detail/ad-detail-types";
import type { AdDetailOpenSeed } from "@/lib/ad-detail/ad-detail-cache";

export type AdDetailDisplaySnapshot = {
  data: AdDetailData;
  hydrating: boolean;
};

function payloadToData(payload: ReturnType<typeof adDetailPayloadFromSeed>): AdDetailData {
  return {
    ok: true,
    ad: payload.ad!,
    competitor: payload.competitor!,
    ai: payload.ai!,
    context: payload.context!,
  };
}

/** Synchronous read for instant drawer paint (cache → seed → optional open seed). */
export function readAdDetailDisplaySnapshot(
  adId: string | null | undefined,
  openSeed?: AdDetailOpenSeed | null,
): AdDetailDisplaySnapshot | null {
  if (adId) {
    const cached = getCachedAdDetail(adId);
    if (cached && isFullAdDetailPayload(cached)) {
      return {
        data: payloadToData(cached),
        hydrating: false,
      };
    }
    const seed = getAdDetailSeed(adId);
    if (seed) {
      return {
        data: payloadToData(adDetailPayloadFromSeed(seed)),
        hydrating: true,
      };
    }
  }
  if (openSeed) {
    return {
      data: payloadToData(adDetailPayloadFromSeed(openSeed)),
      hydrating: !adId,
    };
  }
  return null;
}
