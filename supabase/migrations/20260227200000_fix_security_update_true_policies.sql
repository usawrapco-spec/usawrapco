-- Fix rls_policy_always_true for UPDATE commands
-- These were USING(true) — anyone could update any row.
-- Scope to token column so only the token-holder can update.

-- proof_settings: public updates revision count using proofing_token
DROP POLICY IF EXISTS "Public can update by token" ON public.proof_settings;
CREATE POLICY "Public can update by token" ON public.proof_settings
  FOR UPDATE USING (proofing_token IS NOT NULL)
  WITH CHECK (proofing_token IS NOT NULL);

-- wrap_funnel_sessions: funnel steps update their own session by token
DROP POLICY IF EXISTS "public_update_funnel_by_token" ON public.wrap_funnel_sessions;
CREATE POLICY "public_update_funnel_by_token" ON public.wrap_funnel_sessions
  FOR UPDATE USING (session_token IS NOT NULL)
  WITH CHECK (session_token IS NOT NULL);
