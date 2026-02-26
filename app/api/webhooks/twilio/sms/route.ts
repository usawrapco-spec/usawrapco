import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

/**
 * Check if current time is within business hours (8am-6pm M-F PST)
 */
function isBusinessHours(): boolean {
  const now = new Date()
  const pst = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const day = pst.getDay()
  const hour = pst.getHours()
  return day >= 1 && day <= 5 && hour >= 8 && hour < 18
}

/**
 * Twilio SMS Webhook Handler
 *
 * Receives inbound SMS/MMS from Twilio.
 * - Matches sender to customer record
 * - Saves to communications table
 * - Logs MMS media URLs
 * - Auto-replies after hours
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    // Verify this request is genuinely from Twilio
    const params = formDataToParams(formData)
    if (!isTwilioWebhook(req, params)) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 403, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string || ''
    const messageSid = formData.get('MessageSid') as string
    const numMedia = parseInt((formData.get('NumMedia') as string) || '0', 10)

    if (!from) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 400, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const supabase = getSupabaseAdmin()

    // --- Collect MMS media URLs ---
    const mediaUrls: string[] = []
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = formData.get(`MediaUrl${i}`) as string
      const mediaContentType = formData.get(`MediaContentType${i}`) as string
      if (mediaUrl) {
        mediaUrls.push(mediaUrl)
      }
    }

    // --- Match sender to customer ---
    const normalizedFrom = from.replace(/[^\d]/g, '')
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, assigned_to')
      .or(`phone.eq.${from},phone.eq.+1${normalizedFrom.slice(-10)},phone.eq.${normalizedFrom.slice(-10)}`)
      .eq('org_id', ORG_ID)
      .limit(1)
      .single()

    // --- Save to communications table ---
    await supabase.from('communications').insert({
      org_id: ORG_ID,
      channel: 'sms',
      direction: 'inbound',
      customer_id: customer?.id || null,
      from_address: from,
      to_address: to,
      body: body,
      twilio_message_sid: messageSid,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      status: 'received',
      created_at: new Date().toISOString(),
    })

    // --- Log to activity_log ---
    if (customer?.id) {
      await supabase.from('activity_log').insert({
        org_id: ORG_ID,
        customer_id: customer.id,
        actor_type: 'customer',
        actor_id: customer.id,
        actor_name: customer.name || from,
        action: 'inbound_sms',
        details: body.length > 200 ? body.substring(0, 200) + '...' : body,
        metadata: {
          message_sid: messageSid,
          media_count: numMedia,
          media_urls: mediaUrls,
        },
      })
    }

    // --- Auto-reply after hours ---
    if (!isBusinessHours()) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thanks for reaching out! We'll respond first thing in the morning.</Message>
</Response>`
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // --- During business hours, no auto-reply (team handles it) ---
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error) {
    console.error('Twilio SMS webhook error:', error)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 500, headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
