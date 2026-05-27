-- Stavajici nemovitosti vybrane jako zastava planovaneho uveru.
-- Pri Edit se znovu predvyplni (jako refinanced_loan_ids / sold_property_ids).
ALTER TABLE public.planned_investments
  ADD COLUMN IF NOT EXISTS collateral_property_ids jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.planned_investments.collateral_property_ids IS
  'Stavajici nemovitosti pouzite jako zastava u tohoto planovaneho uveru (jen ID).';
