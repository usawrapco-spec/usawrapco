import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { to, customer_id, project_id } = await req.json()

    if (!to) {
      return NextResponse.json({ error: 'Missing required field: to' }, { status: 400 })
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

    let callSid: string | null = null
    let status: 'queued' | 'failed' | 'sent' = 'queued'

    if (twilioSid && twilioAuth && twilioFrom) {
      // Initiate outbound call via Twilio REST API
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`
      const params = new URLSearchParams({
        To: to,
        From: twilioFrom,
        Url: `${appUrl}/api/comms/call/twiml`,
        StatusCallback: `${appUrl}/api/comms/call/webhook`,
        StatusCallbackMethod: 'POST',
        Record: 'false',
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
        console.error('[comms/call/initiate] Twilio error:', twilioData)
        status = 'failed'
      } else {
        callSid = twilioData.sid
        status = 'queued'
      }
    } else {
      console.log('[comms/call/initiate] Demo mode — Twilio not configured. Would call:', to)
      status = 'queued'
    }

    // Log the call initiation
    const { data: comm, error: insertError } = await admin
      .from('communications')
      .insert({
        org_id: orgId,
        customer_id: customer_id || null,
        project_id: project_id || null,
        direction: 'outbound',
        channel: 'call',
        body: `Outbound call initiated to ${to}`,
        to_number: to,
        from_number: twilioFrom || null,
        status,
        twilio_sid: callSid,
        sent_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[comms/call/initiate] DB insert error:', insertError)
    }

    return NextResponse.json({
      success: true,
      call_sid: callSid,
      message_id: comm?.id,
      status,
      demo: !twilioSid,
    })
  } catch (err: any) {
    console.error('[comms/call/initiate] error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
