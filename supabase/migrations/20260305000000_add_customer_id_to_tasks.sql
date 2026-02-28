-- Add customer_id to tasks so tasks can be linked to a customer directly
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
