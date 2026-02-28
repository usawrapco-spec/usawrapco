-- Index missing FKs on newly created tables (files, job_proofs, job_proof_messages, job_proof_versions, products)
CREATE INDEX IF NOT EXISTS idx_files_created_by               ON public.files(created_by);
CREATE INDEX IF NOT EXISTS idx_job_proof_messages_sender_id   ON public.job_proof_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_job_proof_versions_uploaded_by ON public.job_proof_versions(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_job_proofs_created_by          ON public.job_proofs(created_by);
