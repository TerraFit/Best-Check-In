-- Atomically authorize and complete a business password reset.
-- The reset token is the recovery credential; the caller never supplies a business_id.
-- Netlify invokes this function with the service role through PostgREST RPC.

CREATE OR REPLACE FUNCTION public.reset_business_password_with_token(
  p_token TEXT,
  p_password_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
BEGIN
  SELECT business_id
    INTO v_business_id
    FROM public.password_resets
   WHERE token = p_token
     AND expires_at >= now()
     AND used_at IS NULL
   FOR UPDATE;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_OR_EXPIRED_TOKEN';
  END IF;

  UPDATE public.businesses
     SET password_hash = p_password_hash,
         updated_at = now()
   WHERE id = v_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND';
  END IF;

  UPDATE public.password_resets
     SET used_at = now()
   WHERE token = p_token
     AND used_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOKEN_ALREADY_USED';
  END IF;

  RETURN v_business_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_business_password_with_token(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reset_business_password_with_token(TEXT, TEXT)
  TO service_role;

COMMENT ON FUNCTION public.reset_business_password_with_token(TEXT, TEXT) IS
  'Atomically validates a single-use business password reset token, updates the authoritative business password, and consumes the token.';
