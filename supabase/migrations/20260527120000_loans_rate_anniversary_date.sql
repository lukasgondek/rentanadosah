-- Datum vyroci urokove sazby u uveru (kdy konci fixace).
-- Nepovinne pole — klient ho nemusi znat / vyplnit.
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS rate_anniversary_date DATE;

COMMENT ON COLUMN public.loans.rate_anniversary_date IS
  'Datum vyroci urokove sazby — kdy bance konci fixace.';
