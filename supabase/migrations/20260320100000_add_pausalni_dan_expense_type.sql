-- Add 'pausalni_dan' as valid expense_type for income_sources
ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS check_expense_type;
ALTER TABLE public.income_sources ADD CONSTRAINT check_expense_type
  CHECK (expense_type IS NULL OR expense_type IN ('flat_rate', 'real', 'pausalni_dan'));
