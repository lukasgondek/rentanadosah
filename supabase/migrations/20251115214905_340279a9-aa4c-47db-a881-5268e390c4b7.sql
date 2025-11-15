-- Add income category types and fields for tax calculations
ALTER TABLE public.income_sources 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'self',
ADD COLUMN IF NOT EXISTS gross_salary numeric,
ADD COLUMN IF NOT EXISTS net_salary numeric,
ADD COLUMN IF NOT EXISTS income_amount numeric,
ADD COLUMN IF NOT EXISTS expense_type text,
ADD COLUMN IF NOT EXISTS expense_percentage numeric,
ADD COLUMN IF NOT EXISTS real_expenses numeric,
ADD COLUMN IF NOT EXISTS tax_base numeric,
ADD COLUMN IF NOT EXISTS business_income numeric,
ADD COLUMN IF NOT EXISTS business_expenses numeric,
ADD COLUMN IF NOT EXISTS business_tax_base numeric,
ADD COLUMN IF NOT EXISTS other_amount numeric,
ADD COLUMN IF NOT EXISTS other_frequency text DEFAULT 'monthly';

-- Add check constraints for valid values
ALTER TABLE public.income_sources
ADD CONSTRAINT check_category CHECK (category IN ('employment', 'self_employed_s7', 'rental_s9', 'business', 'other')),
ADD CONSTRAINT check_owner_type CHECK (owner_type IN ('self', 'partner')),
ADD CONSTRAINT check_expense_type CHECK (expense_type IS NULL OR expense_type IN ('flat_rate', 'real')),
ADD CONSTRAINT check_other_frequency CHECK (other_frequency IS NULL OR other_frequency IN ('monthly', 'yearly'));