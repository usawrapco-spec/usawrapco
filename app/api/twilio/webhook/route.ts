/**
 * POST /api/twilio/webhook
 * Configure your Twilio number's SMS webhook URL to:
 *   https://app.usawrapco.com/api/twilio/webhook
 *
 * Validates Twilio HMAC-SHA1 signature, then:
 *  - Finds or creates a customer record from the sender's phone number
 *  - Finds or creates a conversation thread (visible in /inbox)
 *  - Saves the inbound message to conversation_messages
 *  - Logs to the communications table
 *  - Optionally fires an AI auto-reply if enabled for the conversation
 */
export { POST } from '@/app/api/twilio/inbound-sms/route'
