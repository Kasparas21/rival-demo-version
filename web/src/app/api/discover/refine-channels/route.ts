import { NextResponse } from "next/server";
import { CHANNELS, type ChannelId } from "@/components/channel-picker-modal";
import type { PlatformIdentifier } from "@/lib/discovery";

/**
 * Second-pass discovery while confirming profiles — previously ran a deeper homepage mine + search.
 * Meta / Google / LinkedIn ad-library URLs from automation are unreliable; TikTok / Snapchat / Pinterest
 * use keyword chips from discover only. This route no longer auto-fills identifiers.
 */
export const maxDuration = 55;

export type DiscoverRefineChannelsResponse = {
  success: boolean;
  discoveredPatch?: Partial<PlatformIdentifier>;
  fieldConfidencePatch?: Partial<Record<ChannelId, "high" | "medium" | "low">>;
  fieldPreviewUrlsPatch?: Partial<Record<ChannelId, string>>;
  filledChannelCount?: number;
  metaPageUrlFilled?: boolean;
  pinterestAdvertiserFilled?: boolean;
  message?: string;
  error?: string;
};

function normalizeDomainInput(raw: string): string | null {
  const t = raw.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0] ?? "";
  if (!t || !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(t)) return null;
  return t.toLowerCase();
}

function channelLooksEmpty(ids: Partial<PlatformIdentifier>, id: ChannelId): boolean {
  if (id === "meta") return !(ids.meta?.trim() || ids.metaPageUrl?.trim());
  const v = ids[id];
  return !(typeof v === "string" && v.trim());
}

export async function POST(req: Request): Promise<NextResponse<DiscoverRefineChannelsResponse>> {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const domainRaw = typeof body.domain === "string" ? body.domain : "";
    const normalizedDomain = normalizeDomainInput(domainRaw);
    const brandName = typeof body.brandName === "string" ? body.brandName.trim() : "";
    const seedIds = (body.seedIds && typeof body.seedIds === "object" ? body.seedIds : {}) as Partial<
      PlatformIdentifier
    >;
    const rawChannels = Array.isArray(body.channels) ? body.channels : [];
    const requested = [...new Set(rawChannels)].filter((c): c is ChannelId =>
      CHANNELS.some((ch) => ch.id === c)
    );

    if (!normalizedDomain || !brandName) {
      return NextResponse.json(
        { success: false, error: "Missing domain or brand name" },
        { status: 400 }
      );
    }
    if (requested.length === 0) {
      return NextResponse.json(
        { success: false, error: "Select at least one platform to search" },
        { status: 400 }
      );
    }

    const targets = requested.filter((id) => channelLooksEmpty(seedIds, id));
    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        discoveredPatch: {},
        filledChannelCount: 0,
        message: "Those fields already have values — clear a field to search again.",
      });
    }

    return NextResponse.json({
      success: true,
      discoveredPatch: {},
      filledChannelCount: 0,
      metaPageUrlFilled: false,
      pinterestAdvertiserFilled: false,
      message:
        "Automatic profile suggestions are off for these platforms — paste the ad library URL, page ID, or keyword manually.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refine failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
