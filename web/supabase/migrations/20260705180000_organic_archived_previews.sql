-- Archived organic post previews: TikTok/Instagram CDN thumbnails expire within days.
-- Copy each preview image into Supabase Storage at scrape time.

alter table public.organic_posts
  add column if not exists archived_preview_url text;

comment on column public.organic_posts.archived_preview_url is
  'Public Supabase Storage URL of the archived post preview (fallback when platform CDN links expire).';

insert into storage.buckets (id, name, public)
values ('organic-media', 'organic-media', true)
on conflict (id) do nothing;
