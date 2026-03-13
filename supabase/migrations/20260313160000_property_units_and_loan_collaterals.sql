-- ============================================================
-- Migration: Property units (činžák) + Loan collaterals
-- ============================================================

-- 1. Add property_type to properties
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS property_type TEXT NOT NULL DEFAULT 'single'
  CHECK (property_type IN ('single', 'multi'));

-- 2. Create property_units table (sub-units of multi-unit properties)
CREATE TABLE IF NOT EXISTS property_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Jednotka',
  monthly_rent DECIMAL DEFAULT 0,
  monthly_expenses DECIMAL DEFAULT 0,
  is_cadastrally_separated BOOLEAN DEFAULT FALSE,
  estimated_value DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create loan_collaterals junction table
CREATE TABLE IF NOT EXISTS loan_collaterals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  property_unit_id UUID REFERENCES property_units(id) ON DELETE SET NULL,
  collateral_amount DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Either property_id or property_unit_id should be set (or manual via collateral_location on loan)
  CONSTRAINT valid_collateral CHECK (
    property_id IS NOT NULL OR property_unit_id IS NOT NULL
  )
);

-- 4. Triggers for updated_at
CREATE OR REPLACE TRIGGER update_property_units_updated_at
  BEFORE UPDATE ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. RLS for property_units
ALTER TABLE property_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own property units"
  ON property_units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_units.property_id
        AND (p.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        ))
    )
  );

CREATE POLICY "Users can insert own property units"
  ON property_units FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_units.property_id
        AND (p.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        ))
    )
  );

CREATE POLICY "Users can update own property units"
  ON property_units FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_units.property_id
        AND (p.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        ))
    )
  );

CREATE POLICY "Users can delete own property units"
  ON property_units FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_units.property_id
        AND (p.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        ))
    )
  );

-- 6. RLS for loan_collaterals
ALTER TABLE loan_collaterals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loan collaterals"
  ON loan_collaterals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = loan_collaterals.loan_id
        AND (l.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        ))
    )
  );

CREATE POLICY "Users can insert own loan collaterals"
  ON loan_collaterals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = loan_collaterals.loan_id
        AND (l.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        ))
    )
  );

CREATE POLICY "Users can update own loan collaterals"
  ON loan_collaterals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = loan_collaterals.loan_id
        AND (l.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        ))
    )
  );

CREATE POLICY "Users can delete own loan collaterals"
  ON loan_collaterals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = loan_collaterals.loan_id
        AND (l.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        ))
    )
  );
