import {
  getOrganicPostDetailSeed,
  getCachedOrganicPostDetail,
  type OrganicPostDetailOpenSeed,
} from "@/lib/organic-content/organic-post-detail-cache";
import {
  isFullOrganicPostDetailPayload,
  organicPostDetailPayloadFromSeed,
} from "@/lib/organic-content/organic-post-detail-from-seed";
import type { OrganicPostDetailData } from "@/lib/organic-content/organic-post-detail-types";

export type OrganicPostDisplaySnapshot = {
  data: OrganicPostDetailData;
  hydrating: boolean;
};

function payloadToData(payload: ReturnType<typeof organicPostDetailPayloadFromSeed>): OrganicPostDetailData {
  return {
    post: payload.post!,
    competitor: payload.competitor!,
    context: payload.context ?? {},
  };
}

export function readOrganicPostDisplaySnapshot(
  competitorId: string | null | undefined,
  postId: string | null | undefined,
  openSeed?: OrganicPostDetailOpenSeed | null,
): OrganicPostDisplaySnapshot | null {
  if (postId && competitorId) {
    const cached = getCachedOrganicPostDetail(competitorId, postId);
    if (cached && isFullOrganicPostDetailPayload(cached)) {
      return {
        data: payloadToData(cached),
        hydrating: false,
      };
    }
    const seed = getOrganicPostDetailSeed(postId);
    if (seed) {
      return {
        data: payloadToData(organicPostDetailPayloadFromSeed(seed)),
        hydrating: true,
      };
    }
  }
  if (openSeed) {
    return {
      data: payloadToData(organicPostDetailPayloadFromSeed(openSeed)),
      hydrating: !postId,
    };
  }
  return null;
}
