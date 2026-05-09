-- Complimentary admin by auth email (same pattern as 20260508200000_admin_billing_freecardsbf2_by_email.sql).
-- Re-run safe: merges admin_unlimited into raw_payload.

insert into public.billing_subscriptions (
  user_id,
  polar_product_id,
  polar_product_name,
  status,
  raw_payload
)
select
  u.id,
  'a105e33c-ab82-4649-8740-c7a799f654bc',
  'Complimentary (admin)',
  'active',
  jsonb_build_object(
    'admin_unlimited', true,
    'admin_email', u.email
  )
from auth.users u
where lower(trim(u.email)) = lower(trim('attributo@yahoo.com'))
on conflict (user_id) do update set
  status = 'active',
  polar_product_id = excluded.polar_product_id,
  polar_product_name = coalesce(excluded.polar_product_name, public.billing_subscriptions.polar_product_name),
  raw_payload = coalesce(public.billing_subscriptions.raw_payload, '{}'::jsonb)
    || jsonb_build_object(
      'admin_unlimited', true,
      'admin_email', excluded.raw_payload->>'admin_email'
    ),
  updated_at = now();
