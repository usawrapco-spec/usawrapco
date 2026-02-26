/**
 * lib/phone/validate.ts
 * Validates that inbound requests are genuinely from Twilio.
 * Uses the HMAC-SHA1 signature Twilio sends with every webhook.
 */
import twilio from 'twilio'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

/**
 * Call at the top of every Twilio webhook handler.
 * Pass the full Request and a plain-object copy of the POST body params.
 *
 * Returns true when:
 *  - The X-Twilio-Signature header is cryptographically valid
 *
 * Returns false (fail-closed) when:
 *  - TWILIO_AUTH_TOKEN is missing or placeholder in production
 *  - Signature is invalid
 *
 * In development/test mode with no token configured, passes through to
 * allow local testing without a real Twilio account.
 */
export function isTwilioWebhook(
  req: Request,
  bodyParams: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken || authToken.startsWith('PLACEHOLDER')) {
    // Fail closed in production — reject if Twilio is not properly configured
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Twilio] isTwilioWebhook: TWILIO_AUTH_TOKEN not set in production — rejecting request')
      return false
    }
    // Allow through in development for local testing
    return true
  }

  const signature = req.headers.get('x-twilio-signature') ?? ''
  const reqUrl = new URL(req.url)
  const url = `${APP_URL}${reqUrl.pathname}${reqUrl.search}`

  try {
    return twilio.validateRequest(authToken, signature, url, bodyParams)
  } catch {
    return false
  }
}

/** Parse a FormData into a plain string record for signature validation */
export function formDataToParams(body: FormData): Record<string, string> {
  const params: Record<string, string> = {}
  body.forEach((v, k) => { params[k] = String(v) })
  return params
}
