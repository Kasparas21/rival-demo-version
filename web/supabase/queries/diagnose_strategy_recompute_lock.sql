-- Run in Supabase SQL Editor. Replace domain slug as needed.
-- Joins strategy_recompute_locks to saved_competitors (this app has no `competitors` table).

SELECT
  l.competitor_id,
  l.status,
  l.locked_at,
  l.locked_until,
  l.completed_at,
  l.enriched_ads,
  l.total_ads,
  l.last_error,
  l.owner_token IS NOT NULL AS has_owner_token,
  EXTRACT(EPOCH FROM (NOW() - l.locked_at)) AS seconds_since_lock,
  EXTRACT(EPOCH FROM (l.locked_until - NOW())) AS seconds_until_expiry,
  sc.brand_domain,
  sc.slug
FROM strategy_recompute_locks l
JOIN saved_competitors sc ON sc.id = l.competitor_id
WHERE sc.brand_domain ILIKE '%preidenta.lt%'
   OR sc.slug ILIKE '%preidenta%';
