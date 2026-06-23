-- Barcelona / invite cohort dashboard: service-role reads only (no public RLS).

alter table public.tester_invite_redemptions
  add column if not exists cohort_label text;

update public.tester_invite_redemptions
set cohort_label = invite_code
where cohort_label is null;

drop view if exists public.invite_cohort_signups;

create view public.invite_cohort_signups as
select
  r.id as redemption_id,
  r.invite_code,
  coalesce(r.cohort_label, r.invite_code) as cohort_label,
  r.redeemed_at,
  r.user_id,
  u.email,
  p.company_name,
  p.company_url,
  p.company_role,
  p.onboarding_completed,
  bs.status as billing_status,
  bs.polar_product_name,
  bs.trial_end,
  case
    when bs.status = 'trialing'
      and (
        lower(coalesce(bs.polar_product_name, '')) like '%pro%'
        or bs.raw_payload->>'dev_plan_override' = 'pro'
      )
      and not (
        nullif(trim(coalesce(bs.raw_payload->>'tester_invite', '')), '') is not null
        or bs.raw_payload->>'tester_claim_source' = 'complimentary'
        or lower(coalesce(bs.polar_product_name, '')) like '%complimentary%'
        or lower(coalesce(bs.polar_product_name, '')) like '%tester%'
      )
    then 'pro_trial'
    when bs.status in ('active', 'trialing')
      and lower(coalesce(bs.polar_product_name, '')) like '%starter%'
    then 'starter'
    when bs.status in ('active', 'trialing')
      and lower(coalesce(bs.polar_product_name, '')) like '%agency%'
    then 'agency'
    when bs.status = 'active'
      and (
        lower(coalesce(bs.polar_product_name, '')) like '%pro%'
        or bs.raw_payload->>'dev_plan_override' = 'pro'
      )
      and not (
        nullif(trim(coalesce(bs.raw_payload->>'tester_invite', '')), '') is not null
        or bs.raw_payload->>'tester_claim_source' = 'complimentary'
        or lower(coalesce(bs.polar_product_name, '')) like '%complimentary%'
        or lower(coalesce(bs.polar_product_name, '')) like '%tester%'
      )
    then 'pro_paid'
    when nullif(trim(coalesce(bs.raw_payload->>'tester_invite', '')), '') is not null
      or bs.raw_payload->>'tester_claim_source' = 'complimentary'
      or lower(coalesce(bs.polar_product_name, '')) like '%complimentary%'
      or lower(coalesce(bs.polar_product_name, '')) like '%tester%'
      or r.id is not null
    then 'invite_pro'
    when coalesce(bs.raw_payload->>'admin_unlimited', 'false') = 'true'
      or bs.raw_payload->>'dev_plan_override' = 'admin'
    then 'admin'
    when bs.status is null or bs.status in ('none', '')
    then 'none'
    else coalesce(bs.status, 'unknown')
  end as plan_access,
  b.domain as brand_domain,
  (b.ads_profile_setup is not null and b.ads_profile_setup::text not in ('null', '{}')) as has_ads_profile_setup,
  coalesce(sc_stats.competitor_count, 0)::int as competitor_count,
  coalesce(sc_stats.competitor_domains, array[]::text[]) as competitor_domains,
  coalesce(pt_stats.platform_tracking_rows, 0)::int as platform_tracking_rows,
  pt_stats.first_scrape_completed_at,
  case
    when pt_stats.first_scrape_completed_at is not null then 'scrape_complete'
    when coalesce(pt_stats.platform_tracking_rows, 0) > 0 then 'scrape_started'
    when p.onboarding_completed is true then 'onboarding_complete'
    when b.ads_profile_setup is not null and b.ads_profile_setup::text not in ('null', '{}') then 'post_payment_setup'
    when bs.status = 'active' then 'pro_claimed'
    when p.company_url is not null and trim(p.company_url) <> '' then 'pre_payment_saved'
    else 'signed_up'
  end as funnel_stage
from public.tester_invite_redemptions r
left join auth.users u on u.id = r.user_id
left join public.profiles p on p.id = r.user_id
left join public.billing_subscriptions bs on bs.user_id = r.user_id
left join lateral (
  select domain, ads_profile_setup
  from public.brands
  where user_id = r.user_id
  order by is_primary desc nulls last, created_at asc
  limit 1
) b on true
left join lateral (
  select
    count(*) filter (where not coalesce(sc.is_workspace_brand, false)) as competitor_count,
    array_agg(distinct coalesce(nullif(trim(sc.brand_domain), ''), sc.slug, sc.name))
      filter (
        where not coalesce(sc.is_workspace_brand, false)
          and coalesce(nullif(trim(sc.brand_domain), ''), sc.slug, sc.name) is not null
      ) as competitor_domains
  from public.saved_competitors sc
  where sc.user_id = r.user_id
) sc_stats on true
left join lateral (
  select
    count(cpt.id)::int as platform_tracking_rows,
    min(sc.first_scrape_completed_at) as first_scrape_completed_at
  from public.saved_competitors sc
  left join public.competitor_platform_tracking cpt on cpt.competitor_id = sc.id
  where sc.user_id = r.user_id
) pt_stats on true;

comment on view public.invite_cohort_signups is
  'Invite cohort funnel snapshot for ops (Barcelona etc.). Query with service role only.';

revoke all on public.invite_cohort_signups from public, anon, authenticated;
