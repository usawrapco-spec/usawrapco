-- Add gusto_employee_id to employee_pay_settings for Gusto payroll integration
ALTER TABLE employee_pay_settings ADD COLUMN IF NOT EXISTS gusto_employee_id text;
