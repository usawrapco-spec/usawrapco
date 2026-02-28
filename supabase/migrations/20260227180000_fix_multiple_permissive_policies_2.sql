-- Fix remaining multiple_permissive_policies (197 warnings across 35 tables)
-- Strategy per group:
--   identical SELECT+ALL  → drop SELECT (ALL covers it)
--   different SELECT+ALL  → split ALL into cmds + merge conditions
--   service_role+org ALL  → merge into single OR policy
--   portal/public pattern → keep public SELECT/INSERT, convert ALL to UPDATE+DELETE only

-- ── 1. Simple: identical SELECT redundant with ALL ───────────────────────
DROP POLICY IF EXISTS "deckforge_projects_read"          ON public.deckforge_projects;
DROP POLICY IF EXISTS "Org view"                          ON public.designer_specialties;
DROP POLICY IF EXISTS "review_requests_org_select"       ON public.review_requests;
DROP POLICY IF EXISTS "sms_templates_select"             ON public.sms_templates;
DROP POLICY IF EXISTS "Org view"                          ON public.visibility_settings;
DROP POLICY IF EXISTS "pay_settings_own_read"            ON public.employee_pay_settings;
-- email_logs: 3 command-specific policies subsumed by email_logs_access ALL
DROP POLICY IF EXISTS "org members can insert email logs" ON public.email_logs;
DROP POLICY IF EXISTS "org members can view email logs"  ON public.email_logs;
DROP POLICY IF EXISTS "org members can update email logs" ON public.email_logs;
-- rate_card_settings: SELECT(true for authenticated) is too broad; ALL(org) is correct
DROP POLICY IF EXISTS "rate_card_settings_select"        ON public.rate_card_settings;

-- ── 2. conversation_messages: merge org-auth + service_role into one ALL ─
DROP POLICY IF EXISTS "org members access messages"      ON public.conversation_messages;
DROP POLICY IF EXISTS "service role bypass messages"     ON public.conversation_messages;
CREATE POLICY "conversation_messages_access" ON public.conversation_messages
  FOR ALL USING (
    org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
    OR (select auth.role()) = 'service_role'
  );

-- ── 3. conversations: same merge ────────────────────────────────────────
DROP POLICY IF EXISTS "org members access conversations" ON public.conversations;
DROP POLICY IF EXISTS "service role bypass conversations" ON public.conversations;
CREATE POLICY "conversations_access" ON public.conversations
  FOR ALL USING (
    org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
    OR (select auth.role()) = 'service_role'
  );

-- ── 4. brand_portfolios: split ALL, merge SELECT ────────────────────────
DROP POLICY IF EXISTS "org_access"  ON public.brand_portfolios;
DROP POLICY IF EXISTS "public_read" ON public.brand_portfolios;
CREATE POLICY "brand_portfolios_read" ON public.brand_portfolios
  FOR SELECT USING (
    org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
    OR status = ANY(ARRAY['sent','viewed','approved'])
  );
CREATE POLICY "brand_portfolios_write" ON public.brand_portfolios
  FOR INSERT WITH CHECK (
    org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );
CREATE POLICY "brand_portfolios_update" ON public.brand_portfolios
  FOR UPDATE USING (
    org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );
CREATE POLICY "brand_portfolios_delete" ON public.brand_portfolios
  FOR DELETE USING (
    org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );

-- ── 5. company_vehicles: split admin-ALL + org-SELECT ───────────────────
DROP POLICY IF EXISTS "vehicles_admin_write" ON public.company_vehicles;
DROP POLICY IF EXISTS "vehicles_read_all"    ON public.company_vehicles;
CREATE POLICY "company_vehicles_read" ON public.company_vehicles
  FOR SELECT USING (
    org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );
CREATE POLICY "company_vehicles_write" ON public.company_vehicles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY(ARRAY['owner','admin']))
  );

-- ── 6. condition_reports: merge hardcoded-org + token access ────────────
DROP POLICY IF EXISTS "org_manage_condition_reports"   ON public.condition_reports;
DROP POLICY IF EXISTS "public_view_condition_reports"  ON public.condition_reports;
DROP POLICY IF EXISTS "public_sign_condition_reports"  ON public.condition_reports;
CREATE POLICY "condition_reports_read" ON public.condition_reports
  FOR SELECT USING (
    org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid
    OR report_token IS NOT NULL
  );
CREATE POLICY "condition_reports_update" ON public.condition_reports
  FOR UPDATE USING (
    org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid
    OR report_token IS NOT NULL
  );
CREATE POLICY "condition_reports_insert" ON public.condition_reports
  FOR INSERT WITH CHECK (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);
CREATE POLICY "condition_reports_delete" ON public.condition_reports
  FOR DELETE USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

-- ── 7. coupon_redemptions: ALL(org) + SELECT(true) → split ───────────────
DROP POLICY IF EXISTS "Org staff full access on coupon_redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Public read coupon_redemptions"              ON public.coupon_redemptions;
CREATE POLICY "coupon_redemptions_read"   ON public.coupon_redemptions FOR SELECT USING (true);
CREATE POLICY "coupon_redemptions_insert" ON public.coupon_redemptions FOR INSERT
  WITH CHECK (org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));
CREATE POLICY "coupon_redemptions_update" ON public.coupon_redemptions FOR UPDATE
  USING (org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));
CREATE POLICY "coupon_redemptions_delete" ON public.coupon_redemptions FOR DELETE
  USING (org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));

-- ── 8. coupons: ALL(org) + SELECT(active) → split ───────────────────────
DROP POLICY IF EXISTS "Org staff full access on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public read active coupons"       ON public.coupons;
CREATE POLICY "coupons_read" ON public.coupons
  FOR SELECT USING (
    active = true
    OR org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );
CREATE POLICY "coupons_insert" ON public.coupons FOR INSERT
  WITH CHECK (org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));
CREATE POLICY "coupons_update" ON public.coupons FOR UPDATE
  USING (org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));
CREATE POLICY "coupons_delete" ON public.coupons FOR DELETE
  USING (org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));

-- ── 9. design_presentations: ALL(org, bare auth.uid()) + SELECT(true) ───
DROP POLICY IF EXISTS "org_write"    ON public.design_presentations;
DROP POLICY IF EXISTS "public_read"  ON public.design_presentations;
CREATE POLICY "design_presentations_read"   ON public.design_presentations FOR SELECT USING (true);
CREATE POLICY "design_presentations_insert" ON public.design_presentations FOR INSERT
  WITH CHECK (org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));
CREATE POLICY "design_presentations_update" ON public.design_presentations FOR UPDATE
  USING (org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));
CREATE POLICY "design_presentations_delete" ON public.design_presentations FOR DELETE
  USING (org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));

-- ── 10. email_events: ALL(service_role) + SELECT(org) ────────────────────
DROP POLICY IF EXISTS "service role full access email events" ON public.email_events;
DROP POLICY IF EXISTS "org members can view email events"     ON public.email_events;
CREATE POLICY "email_events_read" ON public.email_events
  FOR SELECT USING (
    org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
    OR (select auth.role()) = 'service_role'
  );
CREATE POLICY "email_events_write" ON public.email_events
  FOR ALL USING ((select auth.role()) = 'service_role');

-- ── 11. employee_advances: admin-ALL + own-SELECT + own-UPDATE ───────────
DROP POLICY IF EXISTS "advances_admin_write"    ON public.employee_advances;
DROP POLICY IF EXISTS "advances_own_read"       ON public.employee_advances;
DROP POLICY IF EXISTS "advances_own_acknowledge" ON public.employee_advances;
CREATE POLICY "employee_advances_read" ON public.employee_advances
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY(ARRAY['owner','admin']))
  );
CREATE POLICY "employee_advances_insert" ON public.employee_advances
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY(ARRAY['owner','admin']))
  );
CREATE POLICY "employee_advances_update" ON public.employee_advances
  FOR UPDATE USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY(ARRAY['owner','admin']))
  );
CREATE POLICY "employee_advances_delete" ON public.employee_advances
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY(ARRAY['owner','admin']))
  );

-- ── 12. invoices: remove wildly permissive SELECT(true) ──────────────────
-- Public invoice viewing uses admin client via token, not RLS
DROP POLICY IF EXISTS "public_read_invoices_by_customer" ON public.invoices;

-- ── 13. job_photos: ALL(hardcoded org) + SELECT(portfolio) → split ───────
DROP POLICY IF EXISTS "org_manage_job_photos"        ON public.job_photos;
DROP POLICY IF EXISTS "public_view_portfolio_photos" ON public.job_photos;
CREATE POLICY "job_photos_read" ON public.job_photos
  FOR SELECT USING (
    org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid
    OR is_portfolio = true
    OR is_featured = true
  );
CREATE POLICY "job_photos_write" ON public.job_photos
  FOR ALL USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid)
  WITH CHECK (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

-- ── 14. payroll_line_items: admin-ALL + own-SELECT ────────────────────────
DROP POLICY IF EXISTS "line_items_admin_write" ON public.payroll_line_items;
DROP POLICY IF EXISTS "line_items_own_read"    ON public.payroll_line_items;
CREATE POLICY "payroll_line_items_read" ON public.payroll_line_items
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY(ARRAY['owner','admin']))
  );
CREATE POLICY "payroll_line_items_write" ON public.payroll_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY(ARRAY['owner','admin']))
  );

-- ── 15. portal_messages: ALL(auth) + INSERT(true) + SELECT(true) ─────────
DROP POLICY IF EXISTS "portal_messages_team_all"    ON public.portal_messages;
DROP POLICY IF EXISTS "portal_messages_public_insert" ON public.portal_messages;
DROP POLICY IF EXISTS "portal_messages_public_read" ON public.portal_messages;
CREATE POLICY "portal_messages_read"   ON public.portal_messages FOR SELECT USING (true);
CREATE POLICY "portal_messages_insert" ON public.portal_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "portal_messages_modify" ON public.portal_messages FOR ALL
  USING ((select auth.uid()) IS NOT NULL);

-- ── 16. portal_quote_approvals: same pattern ─────────────────────────────
DROP POLICY IF EXISTS "pqa_team_all"       ON public.portal_quote_approvals;
DROP POLICY IF EXISTS "pqa_public_insert"  ON public.portal_quote_approvals;
DROP POLICY IF EXISTS "pqa_public_read"    ON public.portal_quote_approvals;
CREATE POLICY "pqa_read"   ON public.portal_quote_approvals FOR SELECT USING (true);
CREATE POLICY "pqa_insert" ON public.portal_quote_approvals FOR INSERT WITH CHECK (true);
CREATE POLICY "pqa_modify" ON public.portal_quote_approvals FOR ALL
  USING ((select auth.uid()) IS NOT NULL);

-- ── 17. projects: merge all policies into one ALL ─────────────────────────
DROP POLICY IF EXISTS "projects_org_access"             ON public.projects;
DROP POLICY IF EXISTS "projects_insert_admin_employee"  ON public.projects;
DROP POLICY IF EXISTS "projects_read"                   ON public.projects;
DROP POLICY IF EXISTS "projects_update_admin_employee"  ON public.projects;
CREATE POLICY "projects_access" ON public.projects
  FOR ALL USING (
    customer_id = (select auth.uid())
    OR org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
  )
  WITH CHECK (
    org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );

-- ── 18. proofing_tokens: ALL(org, bare auth.uid()) + SELECT(true) ─────────
DROP POLICY IF EXISTS "org_write"         ON public.proofing_tokens;
DROP POLICY IF EXISTS "public_token_read" ON public.proofing_tokens;
CREATE POLICY "proofing_tokens_read"   ON public.proofing_tokens FOR SELECT USING (true);
CREATE POLICY "proofing_tokens_insert" ON public.proofing_tokens FOR INSERT
  WITH CHECK (org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));
CREATE POLICY "proofing_tokens_update" ON public.proofing_tokens FOR UPDATE
  USING (org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));
CREATE POLICY "proofing_tokens_delete" ON public.proofing_tokens FOR DELETE
  USING (org_id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid())));

-- ── 19. proposal_packages: ALL(org) + SELECT(true) → split ───────────────
DROP POLICY IF EXISTS "org_manage_packages" ON public.proposal_packages;
DROP POLICY IF EXISTS "public_view_packages" ON public.proposal_packages;
CREATE POLICY "proposal_packages_read"  ON public.proposal_packages FOR SELECT USING (true);
CREATE POLICY "proposal_packages_write" ON public.proposal_packages FOR ALL
  USING (proposal_id IN (SELECT proposals.id FROM proposals WHERE proposals.org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid));

-- ── 20. proposal_selections: ALL(org) + INSERT(true) → split ─────────────
DROP POLICY IF EXISTS "org_manage_selections"   ON public.proposal_selections;
DROP POLICY IF EXISTS "public_insert_selections" ON public.proposal_selections;
CREATE POLICY "proposal_selections_insert" ON public.proposal_selections FOR INSERT WITH CHECK (true);
CREATE POLICY "proposal_selections_read"   ON public.proposal_selections FOR SELECT
  USING (proposal_id IN (SELECT proposals.id FROM proposals WHERE proposals.org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid));
CREATE POLICY "proposal_selections_modify" ON public.proposal_selections FOR UPDATE
  USING (proposal_id IN (SELECT proposals.id FROM proposals WHERE proposals.org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid));
CREATE POLICY "proposal_selections_delete" ON public.proposal_selections FOR DELETE
  USING (proposal_id IN (SELECT proposals.id FROM proposals WHERE proposals.org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid));

-- ── 21. proposal_signatures: ALL(auth) + INSERT(true) + SELECT(true) ──────
DROP POLICY IF EXISTS "proposal_signatures_team_all"   ON public.proposal_signatures;
DROP POLICY IF EXISTS "proposal_signatures_anon_insert" ON public.proposal_signatures;
DROP POLICY IF EXISTS "proposal_signatures_anon_select" ON public.proposal_signatures;
CREATE POLICY "proposal_signatures_read"   ON public.proposal_signatures FOR SELECT USING (true);
CREATE POLICY "proposal_signatures_insert" ON public.proposal_signatures FOR INSERT WITH CHECK (true);
CREATE POLICY "proposal_signatures_modify" ON public.proposal_signatures FOR ALL
  USING ((select auth.uid()) IS NOT NULL);

-- ── 22. proposal_upsells: ALL(org) + SELECT(true) → split ────────────────
DROP POLICY IF EXISTS "org_manage_upsells"  ON public.proposal_upsells;
DROP POLICY IF EXISTS "public_view_upsells" ON public.proposal_upsells;
CREATE POLICY "proposal_upsells_read"  ON public.proposal_upsells FOR SELECT USING (true);
CREATE POLICY "proposal_upsells_write" ON public.proposal_upsells FOR ALL
  USING (proposal_id IN (SELECT proposals.id FROM proposals WHERE proposals.org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid));

-- ── 23. proposals: ALL(hardcoded org) + SELECT(token) → split ────────────
DROP POLICY IF EXISTS "org_manage_proposals"  ON public.proposals;
DROP POLICY IF EXISTS "public_view_proposals" ON public.proposals;
CREATE POLICY "proposals_read" ON public.proposals
  FOR SELECT USING (
    org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid
    OR public_token IS NOT NULL
  );
CREATE POLICY "proposals_write" ON public.proposals FOR ALL
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid)
  WITH CHECK (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

-- ── 24. push_subscriptions: ALL(own) + SELECT(service_role) ──────────────
DROP POLICY IF EXISTS "users_own_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "service_role_read"        ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_read" ON public.push_subscriptions
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR (select auth.role()) = 'service_role'
  );
CREATE POLICY "push_subscriptions_write" ON public.push_subscriptions
  FOR ALL USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ── 25. shop_products: ALL(hardcoded org) + SELECT(enabled) ──────────────
DROP POLICY IF EXISTS "org_write_shop"   ON public.shop_products;
DROP POLICY IF EXISTS "public_read_shop" ON public.shop_products;
CREATE POLICY "shop_products_read" ON public.shop_products
  FOR SELECT USING (
    enabled = true
    OR org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid
  );
CREATE POLICY "shop_products_write" ON public.shop_products FOR ALL
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

-- ── 26. shop_sessions: ALL(org OR token) + INSERT(true) ──────────────────
DROP POLICY IF EXISTS "public_shop_sessions" ON public.shop_sessions;
DROP POLICY IF EXISTS "insert_shop_sessions" ON public.shop_sessions;
CREATE POLICY "shop_sessions_read" ON public.shop_sessions
  FOR SELECT USING (
    org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid
    OR session_token IS NOT NULL
  );
CREATE POLICY "shop_sessions_insert"  ON public.shop_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "shop_sessions_update"  ON public.shop_sessions FOR UPDATE
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid OR session_token IS NOT NULL);
CREATE POLICY "shop_sessions_delete"  ON public.shop_sessions FOR DELETE
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid OR session_token IS NOT NULL);

-- ── 27. vehicle_maintenance: admin-ALL + org-SELECT ──────────────────────
DROP POLICY IF EXISTS "maintenance_admin_write" ON public.vehicle_maintenance;
DROP POLICY IF EXISTS "maintenance_read_all"    ON public.vehicle_maintenance;
CREATE POLICY "vehicle_maintenance_read" ON public.vehicle_maintenance
  FOR SELECT USING (
    org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = (select auth.uid()))
  );
CREATE POLICY "vehicle_maintenance_write" ON public.vehicle_maintenance FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY(ARRAY['owner','admin']))
  );

-- ── 28. vehicle_measurements: ALL(service_role) + SELECT(authenticated) ──
DROP POLICY IF EXISTS "service_write"     ON public.vehicle_measurements;
DROP POLICY IF EXISTS "authenticated_read" ON public.vehicle_measurements;
CREATE POLICY "vehicle_measurements_read" ON public.vehicle_measurements
  FOR SELECT USING (
    (select auth.role()) = ANY(ARRAY['authenticated','service_role'])
  );
CREATE POLICY "vehicle_measurements_write" ON public.vehicle_measurements FOR ALL
  USING ((select auth.role()) = 'service_role');
