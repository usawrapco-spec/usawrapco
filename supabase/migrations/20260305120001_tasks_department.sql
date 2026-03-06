-- Add department column to tasks for categorizing by shop department
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS department text
    CHECK (department IN ('sales', 'design', 'production', 'install', 'admin', 'general'))
    DEFAULT 'general';

-- Index for department-based queries
CREATE INDEX IF NOT EXISTS tasks_dept_idx ON tasks(org_id, department, status);
