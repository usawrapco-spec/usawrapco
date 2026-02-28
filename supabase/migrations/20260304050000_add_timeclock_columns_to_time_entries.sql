-- time_entries is used by TimeclockClient with employee_id/clock_in/clock_out columns
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS clock_in timestamptz,
  ADD COLUMN IF NOT EXISTS clock_out timestamptz,
  ADD COLUMN IF NOT EXISTS break_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hours numeric(6,2),
  ADD COLUMN IF NOT EXISTS regular_hours numeric(6,2),
  ADD COLUMN IF NOT EXISTS overtime_hours numeric(6,2);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON public.time_entries(employee_id, clock_in);
