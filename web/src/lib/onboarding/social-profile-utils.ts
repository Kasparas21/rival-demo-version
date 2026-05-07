import { normalizeSocialUrlCandidate } from "@/lib/discovery";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "_r",
  "_ga",
  "__tn__",
  "igsh",
  "igshid",
  "si",
  "ref",
  "refid",
  "ref_src",
  "sr",
  "spm",
  "mkt_tok",
  "mc_cid",
  "mc_eid",
]);

/** Same public profile across m., www, ?ref= variants → one pill */
export function socialProfileDedupeKey(href: string): string {
  try {
    const raw = normalizeSocialUrlCandidate(href).split("#")[0];
    const u = new URL(raw);

    let host = u.hostname.replace(/^www\./i, "").toLowerCase();
    host = host.replace(/^(m|mobile|lm|mbasic|business|l)\./i, "");

    /** Regional LinkedIn hosts (lt.linkedin.com, etc.) → same canonical profile key */
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) host = "linkedin.com";

    if (host.endsWith("facebook.com") || host === "fb.com" || host.endsWith(".facebook.com")) host = "facebook.com";
    if (host.endsWith("instagram.com")) host = "instagram.com";
    if (host === "youtu.be" || host.endsWith("youtube.com")) host = host.includes("youtube") ? "youtube.com" : host;
    if (host === "twitter.com" || host === "x.com") host = "x.com";

    const path = u.pathname.replace(/\/+/g, "/").replace(/\/+$/u, "").toLowerCase();

    const qs = new URLSearchParams();
    u.searchParams.forEach((v, k) => {
      const kl = k.toLowerCase();
      if (!TRACKING_PARAMS.has(kl)) qs.set(k, v);
    });

    const sortedQS =
      [...qs.entries()].sort(([a], [b]) => a.localeCompare(b)).length > 0
        ? "?" + [...qs.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&")
        : "";

    return `${host}${path}${sortedQS}`;
  } catch {
    return normalizeSocialUrlCandidate(href).split("#")[0].toLowerCase();
  }
}

/** @handle / @slug for UI (short, human‑readable) */
export function socialHandleForUrl(href: string): string {
  try {
    const u = new URL(normalizeSocialUrlCandidate(href));
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const hostNoM = host.replace(/^m\./i, "");
    const segs = u.pathname.split("/").map((s) => decodeURIComponent(s)).filter(Boolean);

    if (/facebook\.com$/i.test(hostNoM) || hostNoM === "fb.com") {
      if ((segs[0] ?? "").toLowerCase() === "profile.php") {
        const id = u.searchParams.get("id")?.replace(/\D/g, "");
        return id ? `@${id}` : "@facebook";
      }
      if ((segs[0] ?? "").toLowerCase() === "pg" && segs[1]) return `@${segs[1]}`;
      if ((segs[0] ?? "").toLowerCase() === "people" && segs[1]) return `@${segs[1]}`;
      if (segs[0] && !isFacebookNonProfileSlug(segs[0])) return `@${segs[0]}`;
      return "@facebook";
    }

    if (hostNoM.endsWith("instagram.com")) {
      const skip = new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "direct", "privacy"]);
      const a = segs[0]?.toLowerCase();
      if (a && !skip.has(a)) return `@${segs[0]}`;
      return "@instagram";
    }

    if (hostNoM === "x.com" || hostNoM === "twitter.com") {
      if (segs[0] && !isTwitterNonProfileSlug(segs[0])) return `@${segs[0]}`;
      return "@x";
    }

    if (hostNoM.endsWith("linkedin.com")) {
      if ((segs[0] ?? "").toLowerCase() === "company" && segs[1]) return `@${segs[1]}`;
      if ((segs[0] ?? "").toLowerCase() === "in" && segs[1]) return `@${segs[1]}`;
      return "@linkedin";
    }

    if (hostNoM.endsWith("youtube.com") || hostNoM === "youtu.be") {
      if ((segs[0] ?? "").toLowerCase() === "channel" && segs[1]) return `@${segs[1]}`;
      if ((segs[0] ?? "").toLowerCase() === "c" && segs[1]) return `@${segs[1]}`;
      const atIdx = segs.findIndex((s) => s.startsWith("@"));
      if (atIdx >= 0) return `@${segs[atIdx]!.replace(/^@/, "")}`;
      return "@youtube";
    }

    if (hostNoM.endsWith("tiktok.com")) {
      const i = segs.findIndex((s) => /^@?[a-z0-9_.-]+$/.test(s));
      if (i >= 0) return `@${segs[i]!.replace(/^@/, "")}`;
      return "@tiktok";
    }

    if (hostNoM.endsWith("pinterest.com") && segs[0]) return `@${segs[0]}`;
    if (hostNoM.endsWith("snapchat.com") && segs[0] === "add" && segs[1]) return `@${segs[1]}`;

    return `@${hostNoM.split(".")[0]}`;
  } catch {
    return "@profile";
  }
}

function isFacebookNonProfileSlug(s: string): boolean {
  return /^(sharer|share|dialog|login|privacy|checkpoint|recover|policy|plugins|watch|gaming|marketplace|groups|photos|videos|sale|sell|billing|permalink)\b/i.test(
    s,
  );
}

function isTwitterNonProfileSlug(s: string): boolean {
  return /^(home|explore|search|messages|intent|compose|oauth|signup|login|logout|share|notifications|topics|teams|privacy|tos|lists|following|followers|verified_followers|status|i\b)/i.test(
    s,
  );
}

export type SocialProfileChip = {
  label: string;
  href: string;
  handle: string;
};

export function dedupeAndLabelSocialProfiles(
  items: Array<{ label: string; href: string }>,
  max = 10,
): SocialProfileChip[] {
  const seen = new Map<string, SocialProfileChip>();

  for (const item of items) {
    const key = socialProfileDedupeKey(item.href);
    if (seen.has(key)) continue;
    seen.set(key, {
      label: item.label,
      href: item.href,
      handle: socialHandleForUrl(item.href),
    });
  }

  return [...seen.values()].slice(0, max);
}

export function socialNetworkBucket(href: string): string {
  const h = href.toLowerCase();
  if (/facebook\.com|\.fb\.com|fb\.me|:\/\/fb\./.test(h)) return "facebook";
  if (/instagram\.com/.test(h)) return "instagram";
  if (/linkedin\.com/.test(h)) return "linkedin";
  if (/tiktok\.com/.test(h)) return "tiktok";
  if (/youtube\.com|youtu\.be/.test(h)) return "youtube";
  if (/twitter\.com|\/\/x\.com\//.test(h) || /(^|\.)x\.com\//.test(h)) return "x";
  if (/pinterest\.com/.test(h)) return "pinterest";
  if (/snapchat\.com/.test(h)) return "snapchat";
  return "other";
}

/** Prefer a single “best” profile when the same network appears with multiple URLs */
function preferSocialProfile(a: SocialProfileChip, b: SocialProfileChip): SocialProfileChip {
  const score = (c: SocialProfileChip): number => {
    try {
      const u = new URL(normalizeSocialUrlCandidate(c.href));
      const path = u.pathname.replace(/\/+/g, "/").toLowerCase();
      const bucket = socialNetworkBucket(c.href);
      if (bucket === "linkedin") {
        if (path.includes("/company/")) return 100;
        if (path.includes("/showcase/")) return 85;
        if (path.includes("/school/")) return 70;
        if (path.includes("/in/")) return 45;
        return 30;
      }
      if (bucket === "facebook") {
        if (path.includes("/profile.php")) return 35;
        if (path.includes("/pages/")) return 75;
        return 65;
      }
      return path.length;
    } catch {
      return 0;
    }
  };
  return score(a) >= score(b) ? a : b;
}

const SOCIAL_NETWORK_DISPLAY_ORDER = [
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "youtube",
  "x",
  "pinterest",
  "snapchat",
  "other",
] as const;

/**
 * After URL-level dedupe: keep at most one chip per network (avoids duplicate LinkedIn / Facebook rows).
 */
export function dedupeOnePerSocialNetwork(chips: SocialProfileChip[], max = 8): SocialProfileChip[] {
  const best = new Map<string, SocialProfileChip>();
  for (const c of chips) {
    const bucket = socialNetworkBucket(c.href);
    const cur = best.get(bucket);
    if (!cur) best.set(bucket, c);
    else best.set(bucket, preferSocialProfile(cur, c));
  }
  const order = new Map(SOCIAL_NETWORK_DISPLAY_ORDER.map((k, i) => [k, i]));
  return [...best.entries()]
    .sort(([a], [b]) => (order.get(a as (typeof SOCIAL_NETWORK_DISPLAY_ORDER)[number]) ?? 99) -
      (order.get(b as (typeof SOCIAL_NETWORK_DISPLAY_ORDER)[number]) ?? 99))
    .map(([, v]) => v)
    .slice(0, max);
}
