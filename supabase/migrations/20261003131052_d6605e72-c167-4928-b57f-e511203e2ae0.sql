CREATE TABLE public.student_profiles (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text UNIQUE,
  blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.student_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_hash text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_hash, user_id)
);
CREATE INDEX student_devices_hash_idx ON public.student_devices (device_hash);
GRANT ALL ON public.student_devices TO service_role;
ALTER TABLE public.student_devices ENABLE ROW LEVEL SECURITY;