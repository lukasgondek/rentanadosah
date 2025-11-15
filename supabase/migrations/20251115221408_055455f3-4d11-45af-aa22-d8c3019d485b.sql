-- Fix all RLS policies to use 'authenticated' role instead of 'public'

-- Expenses table
DROP POLICY IF EXISTS "Admins can manage all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;

CREATE POLICY "Users can manage own expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (public.is_admin());

-- Investments table
DROP POLICY IF EXISTS "Admins can manage all investments" ON public.investments;
DROP POLICY IF EXISTS "Users can manage own investments" ON public.investments;

CREATE POLICY "Users can manage own investments"
ON public.investments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all investments"
ON public.investments
FOR ALL
TO authenticated
USING (public.is_admin());

-- Loans table
DROP POLICY IF EXISTS "Admins can manage all loans" ON public.loans;
DROP POLICY IF EXISTS "Users can manage own loans" ON public.loans;

CREATE POLICY "Users can manage own loans"
ON public.loans
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all loans"
ON public.loans
FOR ALL
TO authenticated
USING (public.is_admin());

-- Properties table
DROP POLICY IF EXISTS "Admins can manage all properties" ON public.properties;
DROP POLICY IF EXISTS "Users can manage own properties" ON public.properties;

CREATE POLICY "Users can manage own properties"
ON public.properties
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all properties"
ON public.properties
FOR ALL
TO authenticated
USING (public.is_admin());

-- User roles table
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Add INSERT policy for profiles table
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create whitelist table for approved emails
CREATE TABLE IF NOT EXISTS public.approved_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  notes text
);

-- Enable RLS on approved_emails
ALTER TABLE public.approved_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can manage approved emails
CREATE POLICY "Admins can manage approved emails"
ON public.approved_emails
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Create function to check if email is approved
CREATE OR REPLACE FUNCTION public.is_email_approved(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.approved_emails
    WHERE LOWER(email) = LOWER(check_email)
  );
$$;