ALTER TABLE public.student_profiles ADD COLUMN validation_status text NOT NULL DEFAULT 'approved';
UPDATE public.student_profiles SET validation_status = 'approved';
ALTER TABLE public.student_profiles ALTER COLUMN validation_status SET DEFAULT 'pending';
ALTER TABLE public.student_profiles ADD CONSTRAINT student_profiles_validation_status_check CHECK (validation_status IN ('pending', 'approved', 'rejected'));
COMMENT ON COLUMN public.student_profiles.validation_status IS 'Statut de validation admin : pending (nouveau), approved, rejected';