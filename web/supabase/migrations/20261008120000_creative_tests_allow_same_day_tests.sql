-- A creative test used to be "every ad a competitor launched on one day, on one platform", so this key
-- held by construction. Tests are now groups of 2–10 copy variants launched within 3 days of each other,
-- and two separate tests can start on the same day: the insert failed on this key.
-- Lookups by competitor and launch date keep using creative_tests_competitor_idx.

alter table public.creative_tests
  drop constraint if exists creative_tests_competitor_id_launch_date_platform_key;

comment on table public.creative_tests is
  'Copy-variant groups (2–10 ads, one platform, launched within 3 days) with winner detection (Creative Tests tab).';
