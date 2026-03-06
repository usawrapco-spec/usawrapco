-- Add service_type to estimates to control which T&C is shown to customers
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'wrap';

-- Index for filtering estimates by service type
CREATE INDEX IF NOT EXISTS idx_estimates_service_type ON estimates (service_type);
