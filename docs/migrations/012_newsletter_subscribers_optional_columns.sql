-- Optional columns for newsletter share/referral flow
-- Safe to run if columns already exist (IF NOT EXISTS)
-- Keep newsletter-subscribe Netlify function backward compatible regardless

ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS referred_by text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'email';

-- Ensure unique conflict target used by Prefer: resolution=merge-duplicates
-- and by historical supabase-js onConflict: 'business_id,email'
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_business_email_uidx
  ON public.newsletter_subscribers (business_id, email);

-- Optional index for referral lookups
CREATE INDEX IF NOT EXISTS newsletter_subscribers_access_token_idx
  ON public.newsletter_subscribers (access_token)
  WHERE access_token IS NOT NULL;

COMMENT ON COLUMN public.newsletter_subscribers.access_token IS 'Share/referral token returned to subscriber UI';
COMMENT ON COLUMN public.newsletter_subscribers.referred_by IS 'access_token of referring subscriber';
COMMENT ON COLUMN public.newsletter_subscribers.source IS 'Origin e.g. email, check-in_consent, manual';
