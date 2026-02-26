/** @deprecated Use /api/inbox/send */
import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { to, body, customer_id, project_id } = await req.json()

    if (!to || !body) {
      return NextResponse.json({ error: 'Missing required fields: to, body' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, org_id, name')
      .eq('id', user.id)
      .single()

    const orgId = profile?.org_id || ORG_ID

    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER

    let twilioMessageSid: string | null = null
    let status: 'sent' | 'queued' | 'failed' = 'sent'

    if (twilioSid && twilioAuth && twilioFrom) {
      // Send via Twilio REST API (no SDK needed — raw fetch)
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      const params = new URLSearchParams({
        To: to,
        From: twilioFrom,
        Body: body,
      })

      const twilioRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64')}`,
        },
        body: params.toString(),
      })

      const twilioData = await twilioRes.json()

      if (!twilioRes.ok) {
        console.error('[comms/sms/send] Twilio error:', twilioData)
        status = 'failed'
      } else {
        twilioMessageSid = twilioData.sid
        status = twilioData.status === 'queued' ? 'queued' : 'sent'
      }
    } else {
      // Demo mode — log but don't actually send
      console.log('[comms/sms/send] Demo mode — Twilio not configured. Would send to:', to)
      status = 'sent'
    }

    // Log to customer_communications table
    const { data: comm, error: insertError } = await admin
      .from('customer_communications')
      .insert({
        org_id: orgId,
        customer_id: customer_id || null,
        direction: 'outbound',
        channel: 'sms',
        body,
        agent_id: user.id,
        metadata: { to_number: to, from_number: twilioFrom || null, twilio_sid: twilioMessageSid, status },
      })
      .select()
      .single()

    if (insertError) {
      console.error('[comms/sms/send] DB insert error:', insertError)
    }

    return NextResponse.json({
      success: true,
      message_id: comm?.id,
      twilio_sid: twilioMessageSid,
      status,
      demo: !twilioSid,
    })
  } catch (err: any) {
    console.error('[comms/sms/send] error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
