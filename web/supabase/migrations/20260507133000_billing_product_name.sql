alter table public.billing_subscriptions
  add column if not exists polar_product_name text;
