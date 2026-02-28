-- VehiclePricingClient uses year/make/model/install_hours columns for upsert
-- but table only had vehicle_id/wrap_type/override_price columns
ALTER TABLE public.vehicle_pricing_overrides
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS make text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS install_hours numeric(6,2) DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_pricing_overrides_org_ymm
  ON public.vehicle_pricing_overrides(org_id, year, make, model)
  WHERE year IS NOT NULL AND make IS NOT NULL AND model IS NOT NULL;
