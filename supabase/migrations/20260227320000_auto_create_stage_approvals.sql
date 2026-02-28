-- Function: auto-create 4 pending stage_approval rows when a project is inserted
CREATE OR REPLACE FUNCTION public.create_stage_approvals_for_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.stage_approvals (project_id, org_id, stage, status)
  VALUES
    (NEW.id, NEW.org_id, 'sales',      'pending'),
    (NEW.id, NEW.org_id, 'design',     'pending'),
    (NEW.id, NEW.org_id, 'production', 'pending'),
    (NEW.id, NEW.org_id, 'install',    'pending')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trg_create_stage_approvals ON public.projects;

CREATE TRIGGER trg_create_stage_approvals
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.create_stage_approvals_for_project();
