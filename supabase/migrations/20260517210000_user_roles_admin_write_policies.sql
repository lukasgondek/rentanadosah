-- ============================================================
-- Migration: Admin write policies for user_roles
-- ============================================================
-- Problem: user_roles mělo pouze SELECT RLS politiky. Admin tedy
-- nemohl měnit roli (zájemce ↔ klient) — zápis byl blokován RLS.
-- Frontend navíc dělal upsert s onConflict "user_id", ale tabulka
-- má UNIQUE (user_id, role) → chyba 42P10. Frontend fix: delete+insert.
-- Tato migrace doplňuje chybějící admin write politiky.
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin());
