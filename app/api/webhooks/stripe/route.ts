// ── DEPRECATED alias ─────────────────────────────────────────────────────────
// This route forwards to the canonical Stripe webhook handler.
// Update your Stripe Dashboard webhook URL to:
//   https://app.usawrapco.com/api/payments/webhook
//
// This alias remains so any existing Stripe webhook configurations
// pointing here continue to work during the transition.

export { POST } from '@/app/api/payments/webhook/route'
