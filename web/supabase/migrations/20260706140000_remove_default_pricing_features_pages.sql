-- Remove auto-created pricing/features pages; users add custom URLs instead.
update public.landing_pages
set is_active = false
where page_type in ('pricing', 'features')
  and auto_detected_from is null;
