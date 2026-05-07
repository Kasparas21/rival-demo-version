import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

/** SessionStorage: hero “Spy” saves hostname here; onboarding reads once to pre-fill competitors. */
export const LANDING_COMPETITOR_SESSION_KEY = "rival_landing_competitor_host";

/** Single-line hostname / URL snippet only */
export const MAX_COMPANY_INPUT_CHARS = 300;
export const MAX_COMPETITOR_INPUT_CHARS = 12_000;
export const MAX_COMPETITOR_LINES = 80;
/** Saved during onboarding competitor step */
export const MAX_ONBOARDING_COMPETITORS = 5;

/** Strip ASCII control chars, ZW*, newlines — single-line company field */
export function sanitizeCompanyUrlInput(raw: string): string {
  let s = raw.replace(/\0/g, "").replace(/\r?\n|\r|\t|\f|\v/g, " ");
  s = s.replace(/[\u0000-\u001F\u007F]/g, "");
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/\s+/g, " ");
  return s.slice(0, MAX_COMPANY_INPUT_CHARS);
}

export function sanitizeCompetitorLines(raw: string): string {
  let s = raw.replace(/\0/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (s.length > MAX_COMPETITOR_INPUT_CHARS) s = s.slice(0, MAX_COMPETITOR_INPUT_CHARS);
  const lines = s.split(/\r?\n/);
  if (lines.length > MAX_COMPETITOR_LINES) return lines.slice(0, MAX_COMPETITOR_LINES).join("\n");
  return s;
}

/** Normalize then drop :port for lookups */
export function normalizedWorkspaceHost(trimmedCompanyInput: string): string {
  const base = normalizeCompetitorSlug(trimmedCompanyInput).replace(/\.+$/u, "");
  if (!base.includes(":")) return base;
  if (/^\[[^\]]+]/.test(base)) return base;
  const noPort = base.split(":")[0] ?? base;
  return noPort.trim();
}

/** Basic DNS-shape guard */
export function isPlausiblePublicHostname(host: string): boolean {
  if (!host || host.length > 253) return false;
  const lower = host.toLowerCase();
  if (!lower.includes(".")) return false;
  if (/[^a-z0-9.-]/u.test(lower)) return false;
  const labels = lower.split(".");
  if (labels.length < 2) return false;
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) return false;
    if (!/^[a-z0-9-]+$/.test(label)) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
  }
  const tld = labels[labels.length - 1] ?? "";
  return tld.length >= 2 && /^[a-z]+$/iu.test(tld);
}

export function hostToBrandLabel(host: string): string {
  const h = normalizedWorkspaceHost(host);
  const part = h.split(".")[0] ?? h;
  if (!part) return h;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

export function parseCompetitorHosts(raw: string, maxHosts: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const lines = raw.split(/\r?\n/).slice(0, MAX_COMPETITOR_LINES + 12);
  for (const line of lines) {
    const h = normalizedWorkspaceHost(line);
    if (!h || !isPlausiblePublicHostname(h)) continue;
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(h);
    if (out.length >= maxHosts) break;
  }
  return out;
}
