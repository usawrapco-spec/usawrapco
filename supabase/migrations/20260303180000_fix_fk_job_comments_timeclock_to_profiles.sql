-- Fix job_comments.user_id + time_clock_entries.user_id: were pointing to auth.users
-- PostgREST cannot traverse cross-schema FKs for joins — all chat + timeclock joins were broken

-- job_comments: JobChat.tsx uses .select('*, profiles:user_id(name, avatar_url, role)')
ALTER TABLE job_comments DROP CONSTRAINT job_comments_user_id_fkey;
ALTER TABLE job_comments
  ADD CONSTRAINT job_comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- time_clock_entries: weekly/nightly recap uses .select('*, user:user_id(id, name)')
ALTER TABLE time_clock_entries DROP CONSTRAINT time_clock_entries_user_id_fkey;
ALTER TABLE time_clock_entries
  ADD CONSTRAINT time_clock_entries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
