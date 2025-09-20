-- Profiles sync and policies (run after 01-create-tables.sql)
-- 1) Extend profiles with email/confirm/timestamp
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_email_confirmed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signed_up_at TIMESTAMPTZ;

-- 2) Function to sync from auth.users into public.profiles
CREATE OR REPLACE FUNCTION public.sync_profile_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_email_confirmed, signed_up_at, first_name, last_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
    NEW.created_at,
    COALESCE((NEW.raw_user_meta_data->>'first_name')::text, NULL),
    COALESCE((NEW.raw_user_meta_data->>'last_name')::text, NULL),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    is_email_confirmed = EXCLUDED.is_email_confirmed,
    signed_up_at = EXCLUDED.signed_up_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 3) Trigger on auth.users to call the sync function
DROP TRIGGER IF EXISTS on_auth_user_changed ON auth.users;
CREATE TRIGGER on_auth_user_changed
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_from_auth();

-- 4) Allow users to insert their own profile when done from client (optional safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

