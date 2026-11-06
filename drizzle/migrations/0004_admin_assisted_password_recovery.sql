CREATE TABLE public.password_reset_requests (
 id uuid PRIMARY KEY, email text NOT NULL, user_id uuid,
 code_hash text NOT NULL, code_ciphertext text, grant_hash text,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','handled','verified','processing','used','invalidated','locked')),
 handled_at timestamptz, used_at timestamptz
);
GRANT ALL ON public.password_reset_requests TO service_role;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX password_reset_email_created ON public.password_reset_requests(email, created_at DESC);
CREATE FUNCTION public.request_password_reset(p_id uuid, p_email text, p_hash text, p_cipher text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE latest timestamptz; uid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_email, 0));
 SELECT max(created_at) INTO latest FROM public.password_reset_requests WHERE email=p_email;
 IF latest > now() - interval '60 seconds' THEN RAISE EXCEPTION 'Miandrasa iray minitra vao mangataka indray.'; END IF;
 IF EXISTS(SELECT 1 FROM public.password_reset_requests WHERE email=p_email AND status='processing') THEN RAISE EXCEPTION 'Efa eo am-panovana ny tenimiafina. Miandrasa kely.'; END IF;
 SELECT user_id INTO uid FROM public.student_profiles WHERE lower(email)=p_email LIMIT 1;
 UPDATE public.password_reset_requests SET status='invalidated', code_ciphertext=NULL, grant_hash=NULL WHERE email=p_email AND status IN ('pending','handled','verified');
 INSERT INTO public.password_reset_requests(id,email,user_id,code_hash,code_ciphertext,expires_at) VALUES(p_id,p_email,uid,p_hash,CASE WHEN uid IS NOT NULL THEN p_cipher ELSE NULL END,now()+interval '10 minutes');
END $$;
CREATE FUNCTION public.verify_password_reset(p_email text,p_hash text,p_grant text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.password_reset_requests;
BEGIN
 SELECT * INTO r FROM public.password_reset_requests WHERE email=p_email ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF r.id IS NULL OR r.user_id IS NULL OR r.status NOT IN ('pending','handled') OR r.expires_at <= now() OR r.attempts >= 5 THEN RETURN false; END IF;
 IF r.code_hash <> p_hash THEN
 UPDATE public.password_reset_requests SET attempts=attempts+1,status=CASE WHEN attempts+1>=5 THEN 'locked' ELSE status END,code_ciphertext=CASE WHEN attempts+1>=5 THEN NULL ELSE code_ciphertext END WHERE id=r.id;
 RETURN false;
 END IF;
 UPDATE public.password_reset_requests SET status='verified',grant_hash=p_grant,code_ciphertext=NULL WHERE id=r.id;
 RETURN true;
END $$;
CREATE FUNCTION public.claim_password_reset(p_email text,p_grant text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
 UPDATE public.password_reset_requests SET status='processing' WHERE email=p_email AND grant_hash=p_grant AND status='verified' AND expires_at>now() RETURNING user_id INTO uid;
 RETURN uid;
END $$;
REVOKE ALL ON FUNCTION public.request_password_reset(uuid,text,text,text), public.verify_password_reset(text,text,text), public.claim_password_reset(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_password_reset(uuid,text,text,text), public.verify_password_reset(text,text,text), public.claim_password_reset(text,text) TO service_role;