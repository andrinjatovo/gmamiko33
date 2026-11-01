CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  user_id UUID,
  credits INTEGER NOT NULL,
  operation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX credit_transactions_student_idx ON public.credit_transactions (student_name, created_at DESC);

GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own credit history"
ON public.credit_transactions
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());