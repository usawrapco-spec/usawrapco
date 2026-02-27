-- Drop duplicate indexes, keeping the more descriptive name in each pair
-- appointments.assigned_to: keep idx_appointments_assigned_to
DROP INDEX IF EXISTS public.idx_appointments_assigned;

-- conversation_messages.conversation_id: keep idx_conv_msgs_convo_id
DROP INDEX IF EXISTS public.idx_conv_messages_conversation;

-- conversations.org_id: keep idx_conversations_org_id
DROP INDEX IF EXISTS public.idx_conversations_org;

-- conversations(org_id, status): keep idx_conversations_org_status
DROP INDEX IF EXISTS public.idx_conversations_status;

-- review_requests.org_id: keep idx_review_requests_org_id
DROP INDEX IF EXISTS public.idx_review_requests_org;
