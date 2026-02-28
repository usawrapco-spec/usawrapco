-- Fix designer_bids.designer_id: was pointing to auth.users (PostgREST can't traverse cross-schema FK)
ALTER TABLE designer_bids DROP CONSTRAINT designer_bids_designer_id_fkey;
ALTER TABLE designer_bids
  ADD CONSTRAINT designer_bids_designer_id_fkey
    FOREIGN KEY (designer_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Add missing FK: fishing_reports.user_id → profiles
ALTER TABLE fishing_reports
  ADD CONSTRAINT fishing_reports_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
