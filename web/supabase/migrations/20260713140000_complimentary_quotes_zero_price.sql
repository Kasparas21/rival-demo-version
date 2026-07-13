-- Allow complimentary (free) custom quotes without Polar checkout.

alter table public.custom_quotes
  drop constraint if exists custom_quotes_price_cents_check;

alter table public.custom_quotes
  add constraint custom_quotes_price_cents_check check (price_cents >= 0);
