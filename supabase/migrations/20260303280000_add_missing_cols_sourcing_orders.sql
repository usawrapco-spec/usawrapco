-- Add RFQ/marketplace columns to sourcing_orders
-- SourcingWorkflow component uses these as RFQ tracking fields
ALTER TABLE sourcing_orders
  ADD COLUMN IF NOT EXISTS source_platform  text,
  ADD COLUMN IF NOT EXISTS rfq_title        text,
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS specs            text,
  ADD COLUMN IF NOT EXISTS buyer_name       text,
  ADD COLUMN IF NOT EXISTS buyer_location   text,
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS deadline         date,
  ADD COLUMN IF NOT EXISTS estimated_value  numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS our_sell_price   numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS our_landed_cost  numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_estimate  numeric  DEFAULT 0;
