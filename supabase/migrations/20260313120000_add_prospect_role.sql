-- Add 'prospect' role for consultation deposit payers
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'prospect';

-- Add role column to approved_emails so admin can set role when approving
ALTER TABLE public.approved_emails ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'user';

-- Update trigger: new user gets role from approved_emails (instead of hardcoded 'user')
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger AS $$
DECLARE _role public.app_role;
BEGIN
  SELECT role INTO _role FROM public.approved_emails
    WHERE email = NEW.email LIMIT 1;
  INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE(_role, 'user'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
