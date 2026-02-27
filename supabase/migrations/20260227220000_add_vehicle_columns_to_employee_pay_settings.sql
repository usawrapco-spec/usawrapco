-- Add company vehicle tracking to employee_pay_settings
ALTER TABLE employee_pay_settings
  ADD COLUMN IF NOT EXISTS uses_company_vehicle boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES company_vehicles(id);
