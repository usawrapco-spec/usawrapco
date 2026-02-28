-- FK indexes missed in Phase 4 sweep: installer_messages + installer_schedule
CREATE INDEX IF NOT EXISTS idx_installer_messages_project_id   ON installer_messages (project_id);
CREATE INDEX IF NOT EXISTS idx_installer_messages_recipient_id  ON installer_messages (recipient_id);
CREATE INDEX IF NOT EXISTS idx_installer_schedule_project_id    ON installer_schedule (project_id);
