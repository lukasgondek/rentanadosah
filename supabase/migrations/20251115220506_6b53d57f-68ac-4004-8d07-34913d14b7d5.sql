-- Fix RLS policies for profiles table
-- First, drop any existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create strict policies that only allow authenticated users
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Fix RLS policies for income_sources table
-- Drop any existing policies
DROP POLICY IF EXISTS "Admins can manage all income sources" ON public.income_sources;
DROP POLICY IF EXISTS "Users can manage own income sources" ON public.income_sources;

-- Ensure RLS is enabled
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

-- Create strict policies that only allow authenticated users
CREATE POLICY "Users can manage own income sources"
ON public.income_sources
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all income sources"
ON public.income_sources
FOR ALL
TO authenticated
USING (public.is_admin());

-- Apply same pattern to other sensitive tables
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;