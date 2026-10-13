-- Ads returned by the last complete Meta ACTIVE sweep, so a run cut short (captcha, dead proxy) isn't
-- read as mass kills: a sweep under half of this is only trusted once the next sweep confirms it.
-- Read and written by lib/ad-library/meta-sweep-guard.ts on the competitor's `meta` row.

alter table public.competitor_platform_tracking
  add column if not exists last_sweep_ad_count integer;
