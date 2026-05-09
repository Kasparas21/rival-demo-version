-- Internal admin: full app access + unlimited quotas (raw_payload.admin_unlimited; see getBillingEntitlement).
insert into public.billing_subscriptions (
  user_id,
  polar_product_id,
  status,
  raw_payload
) values (
  '9ac745e8-c5d4-42ba-a61a-a25ef82c2ee3',
  'a105e33c-ab82-4649-8740-c7a799f654bc',
  'active',
  jsonb_build_object(
    'admin_unlimited', true,
    'admin_email', 'freecardsbf2@gmail.com'
  )
)
on conflict (user_id) do update set
  status = 'active',
  raw_payload = coalesce(public.billing_subscriptions.raw_payload, '{}'::jsonb)
    || jsonb_build_object(
      'admin_unlimited', true,
      'admin_email', 'freecardsbf2@gmail.com'
    ),
  updated_at = now();
