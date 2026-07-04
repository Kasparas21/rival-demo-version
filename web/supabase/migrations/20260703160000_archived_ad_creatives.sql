-- Archived ad creatives: platform CDN links (Meta especially) expire, killing previews
-- for ended ads. We copy each creative image / video thumbnail into Supabase Storage at
-- scrape time and fall back to that copy when the CDN link dies.

alter table public.scraped_ads
  add column if not exists archived_creative_url text;

comment on column public.scraped_ads.archived_creative_url is
  'Public Supabase Storage URL of the archived creative image (fallback when the platform CDN link expires).';

-- Public-read bucket; uploads happen server-side with the service role only.
insert into storage.buckets (id, name, public)
values ('ad-creatives', 'ad-creatives', true)
on conflict (id) do nothing;
