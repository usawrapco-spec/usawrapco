-- Fix missing/broken FK constraints that were causing PostgREST 400 errors
-- on join queries for invoices (customer) and stage_approvals (approver)

-- 1. Clean up orphaned customer_id refs in invoices (so FK can be added safely)
UPDATE invoices
SET customer_id = NULL
WHERE customer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = invoices.customer_id);

-- 2. Add missing FK: invoices.customer_id -> customers.id
--    Enables PostgREST join: customer:customer_id(id,name,email)
ALTER TABLE invoices
  ADD CONSTRAINT invoices_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- 3. Drop old FK on stage_approvals.approved_by (was pointing to auth.users —
--    PostgREST cannot traverse cross-schema FKs to fetch name/avatar_url)
ALTER TABLE stage_approvals
  DROP CONSTRAINT IF EXISTS stage_approvals_approved_by_fkey;

-- 4. Re-add FK pointing to public.profiles so PostgREST can join name/avatar_url
--    Enables PostgREST join: approver:approved_by(name,avatar_url)
ALTER TABLE stage_approvals
  ADD CONSTRAINT stage_approvals_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;
