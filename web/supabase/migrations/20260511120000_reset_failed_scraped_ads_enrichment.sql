-- Retry queue for ads that failed enrichment before multilang + normalization fixes (sov-10-enrichment-multilang).
UPDATE public.scraped_ads
SET ai_enrichment_status = 'pending'
WHERE ai_enrichment_status = 'failed'
  AND ai_extracted_angle IS NULL
  AND funnel_stage IS NULL;
