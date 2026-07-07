-- Animation calibration for landing page change detection

alter table public.landing_pages
  add column if not exists animation_calibration_status text not null default 'pending';

alter table public.landing_pages
  add column if not exists animation_mask_json jsonb not null default '[]'::jsonb;

alter table public.landing_pages
  add column if not exists animation_calibrated_at timestamptz;

alter table public.landing_pages
  add constraint landing_pages_animation_calibration_status_check
  check (animation_calibration_status in ('pending', 'running', 'done', 'failed'));

notify pgrst, 'reload schema';
