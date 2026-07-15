const FALLBACK_QUIET_HOURS_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Helsinki",
  "Europe/Vilnius",
  "Europe/Riga",
  "Europe/Tallinn",
  "Europe/Warsaw",
  "Europe/Prague",
  "Europe/Vienna",
  "Europe/Zurich",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "America/Mexico_City",
] as const;

function allIanaTimezones(): string[] {
  try {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      return [...Intl.supportedValuesOf("timeZone")].sort((a, b) => a.localeCompare(b));
    }
  } catch {
    // ignore unsupported environments
  }
  return [...FALLBACK_QUIET_HOURS_TIMEZONES];
}

/** Ordered timezone list for quiet-hours UI — browser + saved value pinned first. */
export function quietHoursTimezoneOptions(params: {
  current?: string | null;
  browserTimezone: string;
}): string[] {
  const current = params.current?.trim() || params.browserTimezone;
  const all = allIanaTimezones();
  const pinned = [params.browserTimezone, current].filter(Boolean);
  const rest = all.filter((tz) => !pinned.includes(tz));
  const options = [...pinned, ...rest];
  if (!all.includes(current) && current) {
    return [current, ...options.filter((tz) => tz !== current)];
  }
  return options;
}

export function formatQuietHoursTimezoneLabel(timezone: string, browserTimezone: string): string {
  if (timezone === browserTimezone) return `${timezone} (your device)`;
  return timezone;
}
