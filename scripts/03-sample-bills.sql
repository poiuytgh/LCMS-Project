-- Sample bills for development and testing
-- This script should be run after users and contracts are created

-- Insert sample bills for existing contracts
-- Note: This assumes there are contracts in the system
-- In production, bills would be generated automatically via cron jobs

-- Sample bill for contract (replace with actual contract IDs)
INSERT INTO public.bills (
  contract_id,
  billing_month,
  rent_amount,
  water_previous_reading,
  water_current_reading,
  water_unit_rate,
  water_amount,
  power_previous_reading,
  power_current_reading,
  power_unit_rate,
  power_amount,
  internet_amount,
  other_charges,
  total_amount,
  status,
  due_date
) VALUES
-- Sample bills (these would be generated automatically in production)
-- You can uncomment and modify these once you have actual contract IDs
/*
(
  'contract-id-here',
  '2024-01-01',
  8000.00,
  100,
  120,
  15.00,
  300.00,
  200,
  250,
  4.50,
  225.00,
  500.00,
  0.00,
  9025.00,
  'unpaid',
  '2024-01-15'
),
(
  'contract-id-here',
  '2024-02-01',
  8000.00,
  120,
  145,
  15.00,
  375.00,
  250,
  295,
  4.50,
  202.50,
  500.00,
  0.00,
  9077.50,
  'paid',
  '2024-02-15'
)
*/;

-- Function to generate monthly bills (would be called by cron job)
CREATE OR REPLACE FUNCTION generate_monthly_bills(target_month DATE)
RETURNS INTEGER AS $$
DECLARE
  contract_record RECORD;
  bills_created INTEGER := 0;
BEGIN
  -- Loop through all active contracts
  FOR contract_record IN 
    SELECT * FROM public.contracts 
    WHERE status = 'active' 
    AND start_date <= target_month 
    AND end_date >= target_month
  LOOP
    -- Check if bill already exists for this month
    IF NOT EXISTS (
      SELECT 1 FROM public.bills 
      WHERE contract_id = contract_record.id 
      AND billing_month = target_month
    ) THEN
      -- Insert new bill
      INSERT INTO public.bills (
        contract_id,
        billing_month,
        rent_amount,
        water_previous_reading,
        water_current_reading,
        water_unit_rate,
        water_amount,
        power_previous_reading,
        power_current_reading,
        power_unit_rate,
        power_amount,
        internet_amount,
        other_charges,
        total_amount,
        status,
        due_date
      ) VALUES (
        contract_record.id,
        target_month,
        contract_record.rent_amount,
        0, -- Previous reading (would be fetched from last month)
        0, -- Current reading (would be input by admin)
        15.00, -- Default water rate
        0, -- Calculated water amount
        0, -- Previous power reading
        0, -- Current power reading
        4.50, -- Default power rate
        0, -- Calculated power amount
        500.00, -- Default internet amount
        0.00, -- Other charges
        contract_record.rent_amount + 500.00, -- Total (rent + internet, utilities calculated later)
        'unpaid',
        target_month + INTERVAL '15 days' -- Due date: 15th of the month
      );
      
      bills_created := bills_created + 1;
    END IF;
  END LOOP;
  
  RETURN bills_created;
END;
$$ LANGUAGE plpgsql;

-- Function to update contract status based on end date
CREATE OR REPLACE FUNCTION update_contract_statuses()
RETURNS INTEGER AS $$
DECLARE
  contracts_updated INTEGER := 0;
BEGIN
  -- Mark contracts as expiring (30 days before end date)
  UPDATE public.contracts 
  SET status = 'expiring'
  WHERE status = 'active'
  AND end_date <= CURRENT_DATE + INTERVAL '30 days'
  AND end_date > CURRENT_DATE;
  
  GET DIAGNOSTICS contracts_updated = ROW_COUNT;
  
  -- Mark contracts as expired
  UPDATE public.contracts 
  SET status = 'expired'
  WHERE status IN ('active', 'expiring')
  AND end_date < CURRENT_DATE;
  
  GET DIAGNOSTICS contracts_updated = contracts_updated + ROW_COUNT;
  
  RETURN contracts_updated;
END;
$$ LANGUAGE plpgsql;
