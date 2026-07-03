import type { MetaAdCard } from "@/lib/ad-library/normalize";
import { metaCardForLifecycle } from "@/lib/ad-library/meta-payload-lifecycle";
import { formatDetailMediumDateUtcMs } from "@/lib/ad-detail/detail-field-format";

function formatIsoDate(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return formatDetailMediumDateUtcMs(ms);
}

function metaEndedAtIso(payload: unknown): string | null {
  const card = metaCardForLifecycle(payload);
  const endedAt = card?.endedAt;
  if (endedAt == null || !Number.isFinite(endedAt) || endedAt <= 0) return null;
  const ms = endedAt > 1e12 ? endedAt : endedAt * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatMetaDetailStatusLabel(params: {
  isKilled: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  runStartLabel: string | null;
  rawPayload: unknown;
}): string {
  const runStart = params.runStartLabel?.trim() || formatIsoDate(params.firstSeenAt);

  if (!params.isKilled) {
    return `Still running · from ${runStart}`;
  }

  const endedIso = metaEndedAtIso(params.rawPayload);
  if (endedIso) {
    return `Inactive · ended ${formatIsoDate(endedIso)}`;
  }

  const card = metaCardForLifecycle(params.rawPayload);
  if (card?.isActive === false && !metaEndedAtIso(params.rawPayload)) {
    return "Inactive";
  }

  return `Killed · last seen ${formatIsoDate(params.lastSeenAt)}`;
}
