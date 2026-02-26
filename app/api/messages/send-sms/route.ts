import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { conversation_id, customer_id, body, media_urls } = await req.json()

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    const { data: customer } = await supabase
      .from('customers')
      .select('phone, name')
      .eq('id', customer_id)
      .single()

    if (!customer?.phone)
      return NextResponse.json({ error: 'No phone number' }, { status: 400 })

    // Send via Twilio REST API
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 })
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const params = new URLSearchParams({
      To: customer.phone,
      From: fromNumber,
      Body: body,
    })
    if (media_urls?.length) {
      media_urls.forEach((url: string) => params.append('MediaUrl', url))
    }

    const twiRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const twiData = await twiRes.json()

    // Save to conversation_messages
    await supabase.from('conversation_messages').insert({
      conversation_id,
      channel: 'sms',
      direction: 'outbound',
      body,
      attachments: media_urls?.length
        ? media_urls.map((u: string) => ({ url: u, type: 'image' }))
        : null,
      sent_by: user.id,
      sender_name: profile?.name || 'Team',
      status: 'sent',
    })

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: body.substring(0, 100),
        last_message_channel: 'sms',
      })
      .eq('id', conversation_id)

    // Pause AI on this thread since human responded
    await supabase
      .from('conversation_ai_config')
      .upsert(
        {
          conversation_id,
          paused_by: user.id,
          paused_at: new Date().toISOString(),
        },
        { onConflict: 'conversation_id' }
      )
      .catch(() => {})

    return NextResponse.json({ ok: true, sid: twiData.sid })
  } catch (error) {
    console.error('Send SMS error:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
