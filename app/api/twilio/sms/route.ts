import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

/**
 * Send SMS via Twilio
 *
 * POST { to, message, customerId?, projectId? }
 * Sends an outbound SMS, logs to communications table.
 */
export async function POST(req: NextRequest) {
  try {
    // --- Check Twilio credentials ---
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const defaultFrom = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio is not connected. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.' },
        { status: 503 }
      )
    }

    if (!defaultFrom) {
      return NextResponse.json(
        { error: 'TWILIO_PHONE_NUMBER is not set.' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { to, message, customerId, projectId } = body as {
      to: string
      message: string
      customerId?: string
      projectId?: string
    }

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      )
    }

    // --- Send via Twilio REST API ---
    const smsRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: defaultFrom,
          Body: message,
        }).toString(),
      }
    )
    const smsResult = await smsRes.json()
    if (!smsRes.ok) {
      return NextResponse.json({ error: smsResult.message || 'Twilio SMS failed' }, { status: 500 })
    }

    // --- Resolve customer if not provided ---
    const supabase = getSupabaseAdmin()
    let resolvedCustomerId = customerId || null

    if (!resolvedCustomerId) {
      const normalizedTo = to.replace(/[^\d]/g, '')
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .or(`phone.eq.${to},phone.eq.+1${normalizedTo.slice(-10)},phone.eq.${normalizedTo.slice(-10)}`)
        .eq('org_id', ORG_ID)
        .limit(1)
        .single()
      resolvedCustomerId = customer?.id || null
    }

    // --- Log to communications table ---
    await supabase.from('communications').insert({
      org_id: ORG_ID,
      channel: 'sms',
      direction: 'outbound',
      customer_id: resolvedCustomerId,
      project_id: projectId || null,
      from_address: defaultFrom,
      to_address: to,
      body: message,
      twilio_message_sid: smsResult.sid,
      status: smsResult.status || 'sent',
      created_at: new Date().toISOString(),
    })

    // --- Log to activity_log ---
    if (resolvedCustomerId) {
      await supabase.from('activity_log').insert({
        org_id: ORG_ID,
        customer_id: resolvedCustomerId,
        actor_type: 'user',
        actor_id: null,
        actor_name: 'System',
        action: 'outbound_sms',
        details: message.length > 200 ? message.substring(0, 200) + '...' : message,
        metadata: {
          message_sid: smsResult.sid,
          project_id: projectId || null,
        },
      })
    }

    return NextResponse.json({
      messageSid: smsResult.sid,
      status: smsResult.status,
    })
  } catch (error: any) {
    console.error('Send SMS error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
