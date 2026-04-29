-- Password reset account lookup.
-- Allows the app to confirm an email belongs to a Partify profile before
-- sending a reset email. This intentionally reveals account existence.

CREATE OR REPLACE FUNCTION public.can_request_password_reset(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE lower(email) = lower(trim(p_email))
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_request_password_reset(TEXT) TO anon, authenticated;
