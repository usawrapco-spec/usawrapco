-- Allow an email campaign to be linked to a specific customer account
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
