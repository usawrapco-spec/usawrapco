import { ORG_ID } from '@/lib/org'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

function validateTwilioSignature(req: NextRequest, body: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return true // No token configured, skip validation

  const signature = req.headers.get('x-twilio-signature') || ''
  if (!signature) return false

  try {
    const crypto = require('crypto')
    const url = req.url
    // Sort POST params and append to URL for Twilio signature validation
    const params = new URLSearchParams(body)
    const sortedKeys = Array.from(params.keys()).sort()
    let signingStr = url
    for (const key of sortedKeys) {
      signingStr += key + (params.get(key) || '')
    }
    const expected = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(signingStr, 'utf-8'))
      .digest('base64')
    return expected === signature
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    // Validate Twilio signature if auth token is set
    if (process.env.TWILIO_AUTH_TOKEN) {
      const isValid = validateTwilioSignature(req, body)
      if (!isValid) {
        console.error('[webhooks/twilio] invalid signature')
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    // Parse URL-encoded Twilio webhook body
    const params = new URLSearchParams(body)
    const from = params.get('From') || ''
    const to = params.get('To') || ''
    const messageBody = params.get('Body') || ''
    const messageSid = params.get('MessageSid') || ''
    const numMedia = parseInt(params.get('NumMedia') || '0', 10)

    console.log('[webhooks/twilio] inbound SMS:', { from, to, messageSid, body: messageBody.slice(0, 100) })

    // Log to Supabase communication_log
    const admin = getSupabaseAdmin()
    await admin.from('communication_log').insert({
      org_id: ORG_ID,
      direction: 'inbound',
      channel: 'sms',
      from_number: from,
      to_number: to,
      message_body: messageBody,
      external_id: messageSid,
      has_media: numMedia > 0,
      metadata: {
        num_media: numMedia,
        twilio_params: Object.fromEntries(params.entries()),
      },
      created_at: new Date().toISOString(),
    })

    // Try to link to a known customer/conversation
    if (from) {
      const { data: customer } = await admin
        .from('customers')
        .select('id, name')
        .eq('org_id', ORG_ID)
        .or(`phone.eq.${from},phone.eq.${from.replace('+1', '')}`)
        .limit(1)
        .single()

      if (customer) {
        console.log('[webhooks/twilio] matched customer:', customer.name)
        // Log to conversations table if it exists
        await admin.from('messages').insert({
          org_id: ORG_ID,
          customer_id: customer.id,
          direction: 'inbound',
          channel: 'sms',
          body: messageBody,
          external_id: messageSid,
          created_at: new Date().toISOString(),
        }).select()
      }
    }

    // Return TwiML empty response (no auto-reply)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    console.error('[webhooks/twilio] error:', err)
    // Always return 200 to Twilio to prevent retries
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
