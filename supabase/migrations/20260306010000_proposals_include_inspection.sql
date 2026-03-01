-- Add include_inspection flag to proposals
-- Controls whether the vehicle inspection notes section is shown on the customer-facing proposal
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS include_inspection boolean NOT NULL DEFAULT true;
