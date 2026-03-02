/**
 * POST /api/twilio/send
 * Send an outbound SMS via Twilio. Requires an authenticated session.
 *
 * Body: { to: string, body: string, conversation_id?: string }
 *
 *  - Calls the Twilio REST API to deliver the SMS
 *  - Inserts an outbound message into conversation_messages (visible in /inbox)
 *  - Updates conversation.last_message_at / last_message_preview
 *  - Logs to the communications table
 *
 * Note: The /inbox UI sends through /api/inbox/send (handles email + SMS + notes
 * in a single unified flow). Use this endpoint for direct programmatic sends
 * (e.g., job-triggered notifications, automation, etc.).
 */
export { POST } from '@/app/api/twilio/send-sms/route'
