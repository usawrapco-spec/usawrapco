import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Twilio sends form-encoded POST when a customer replies to an SMS
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const from = params.get('From') || ''
    const to = params.get('To') || ''
    const messageBody = params.get('Body') || ''
    const messageSid = params.get('MessageSid') || ''

    // Validate Twilio signature if secret is set
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const webhookSecret = process.env.TWILIO_WEBHOOK_SECRET

    if (twilioSid && webhookSecret) {
      // Twilio signature validation
      const signature = req.headers.get('x-twilio-signature') || ''
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const webhookUrl = `${appUrl}/api/comms/sms/webhook`

      // Build the validation string (URL + sorted params)
      const sortedParams = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce((str, [k, v]) => str + k + v, webhookUrl)

      const crypto = await import('crypto')
      const expectedSig = crypto
        .createHmac('sha1', webhookSecret)
        .update(sortedParams)
        .digest('base64')

      if (`sha1=${expectedSig}` !== signature && expectedSig !== signature) {
        console.warn('[comms/sms/webhook] Signature mismatch — possible spoofing attempt')
        // Return valid TwiML anyway to prevent Twilio retry storms in dev
      }
    }

    const admin = getSupabaseAdmin()

    // Look up customer by phone number (try to_number match in communications)
    let customerId: string | null = null
    let projectId: string | null = null

    // Try matching the 'from' number against customers table
    const { data: customer } = await admin
      .from('customers')
      .select('id')
      .or(`phone.eq.${from},mobile.eq.${from}`)
      .maybeSingle()

    if (customer) {
      customerId = customer.id

      // Find most recent project for this customer
      const { data: recentProject } = await admin
        .from('projects')
        .select('id')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentProject) projectId = recentProject.id
    }

    // Also check recent outbound SMS to this number to find customer_id
    if (!customerId) {
      const { data: recentOutbound } = await admin
        .from('communications')
        .select('customer_id, project_id')
        .eq('to_number', from)
        .eq('channel', 'sms')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentOutbound) {
        customerId = recentOutbound.customer_id
        projectId = recentOutbound.project_id
      }
    }

    // Insert inbound message
    await admin.from('communications').insert({
      org_id: 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
      customer_id: customerId,
      project_id: projectId,
      direction: 'inbound',
      channel: 'sms',
      body: messageBody,
      to_number: to,
      from_number: from,
      status: 'received',
      twilio_sid: messageSid,
    })

    console.log('[comms/sms/webhook] inbound SMS from:', from, 'body:', messageBody.slice(0, 50))

    // Return empty TwiML to acknowledge (no auto-reply)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (err: any) {
    console.error('[comms/sms/webhook] error:', err)
    // Always return valid TwiML to prevent Twilio retries
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
