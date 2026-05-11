-- Persist Ads Library identifiers + channel selection per saved competitor (cross-device, survives logout).
alter table public.saved_competitors
  add column if not exists ads_library_context jsonb;

comment on column public.saved_competitors.ads_library_context is
  'Optional { ids, channels, confirmed } for rebuilding /api/ads/library payloads after account restore.';
