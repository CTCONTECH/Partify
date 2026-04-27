-- Production auth/profile hardening
-- Ensures confirmed auth users can access their own profile and creates
-- the app profile automatically from Supabase Auth signup metadata.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'::user_role),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

INSERT INTO public.profiles (id, email, role, name, phone)
SELECT
  u.id,
  u.email,
  COALESCE((u.raw_user_meta_data->>'role')::user_role, 'client'::user_role),
  COALESCE(NULLIF(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1)),
  NULLIF(u.raw_user_meta_data->>'phone', '')
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone;
