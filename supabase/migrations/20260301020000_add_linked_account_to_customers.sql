-- Allow a contact/customer record to be linked to a parent company account
ALTER TABLE customers ADD COLUMN IF NOT EXISTS linked_account_id uuid REFERENCES customers(id) ON DELETE SET NULL;
