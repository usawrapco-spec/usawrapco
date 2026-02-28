-- Add missing columns to invoices table
-- InvoiceDetailClient reads/updates these but they didn't exist in DB
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS title     text,
  ADD COLUMN IF NOT EXISTS tax_rate  numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS form_data jsonb    DEFAULT '{}'::jsonb;
