-- Allow a team member profile to be linked to a customer record
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
