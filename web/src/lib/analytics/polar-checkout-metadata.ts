import type { NextRequest } from "next/server";

export type PolarCheckoutBrowserMetadata = {
  fbp: string;
  fbc: string;
  client_ip: string;
  user_agent: string;
};

function readFbclid(requestUrl: URL, referer: string | null): string | null {
  const fromRequest = requestUrl.searchParams.get("fbclid")?.trim();
  if (fromRequest) return fromRequest;

  if (!referer) return null;
  try {
    const fromReferer = new URL(referer).searchParams.get("fbclid")?.trim();
    return fromReferer || null;
  } catch {
    return null;
  }
}

function readClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  const ip = request.ip?.trim();
  if (ip) return ip;

  return "";
}

/** Meta / browser signals for Polar checkout metadata (CAPI matching). */
export function buildPolarCheckoutBrowserMetadata(request: NextRequest): PolarCheckoutBrowserMetadata {
  const fbp = request.cookies.get("_fbp")?.value?.trim() ?? "";

  let fbc = request.cookies.get("_fbc")?.value?.trim() ?? "";
  if (!fbc) {
    const fbclid = readFbclid(request.nextUrl, request.headers.get("referer"));
    if (fbclid) {
      fbc = `fb.1.${Date.now()}.${fbclid}`;
    }
  }

  return {
    fbp,
    fbc,
    client_ip: readClientIp(request),
    user_agent: request.headers.get("user-agent")?.trim() ?? "",
  };
}
