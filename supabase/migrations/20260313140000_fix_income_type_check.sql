-- Fix: income_sources_type_check constraint was blocking frontend values
-- Old constraint allowed: employee, self_employed, company
-- Frontend sends: salary, self_employed, rental, business, other
-- New constraint includes both old and new values for backwards compatibility

ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_type_check;

ALTER TABLE public.income_sources ADD CONSTRAINT income_sources_type_check
  CHECK (type = ANY (ARRAY['salary', 'self_employed', 'rental', 'business', 'other', 'employee', 'company']));
