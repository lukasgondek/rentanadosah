-- Create table for planned investments
CREATE TABLE public.planned_investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Property details
  property_identifier TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL,
  estimated_value NUMERIC NOT NULL,
  monthly_rent NUMERIC NOT NULL,
  monthly_expenses NUMERIC NOT NULL,
  
  -- Growth rates
  appreciation_percent NUMERIC NOT NULL DEFAULT 5,
  rent_growth_percent NUMERIC NOT NULL DEFAULT 5,
  
  -- Loan details
  loan_amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL,
  ltv_percent NUMERIC NOT NULL,
  term_months INTEGER NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planned_investments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own planned investments"
ON public.planned_investments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all planned investments"
ON public.planned_investments
FOR ALL
USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_planned_investments_updated_at
BEFORE UPDATE ON public.planned_investments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();