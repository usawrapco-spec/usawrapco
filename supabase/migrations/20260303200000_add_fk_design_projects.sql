-- Add missing FK constraints to design_projects
-- design/[id]/print-layout uses: .select('linked_project:project_id(id, title, ...)')
-- design/proofs uses designer_id join on design_proofs (already had FK), but design_projects had none

-- Clean orphaned project_id values first
UPDATE design_projects SET project_id = NULL
WHERE project_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = design_projects.project_id);

ALTER TABLE design_projects
  ADD CONSTRAINT design_projects_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  ADD CONSTRAINT design_projects_designer_id_fkey
    FOREIGN KEY (designer_id) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT design_projects_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
