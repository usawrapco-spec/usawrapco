ALTER TABLE design_projects ADD COLUMN IF NOT EXISTS intake_id UUID REFERENCES design_intakes(id);
