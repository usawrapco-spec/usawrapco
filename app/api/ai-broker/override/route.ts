import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversation_id, action, message } = await req.json()
  if (!conversation_id || !action) {
    return NextResponse.json({ error: 'conversation_id and action required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  if (action === 'take_over') {
    // Human takes over
    await admin.from('conversations').update({
      ai_enabled: false,
      status: 'escalated',
      ai_paused_by: user.id,
      updated_at: new Date().toISOString(),
    }).eq('id', conversation_id)

    return NextResponse.json({ success: true, ai_enabled: false })
  }

  if (action === 're_enable_ai') {
    // Re-enable AI after human resolves
    await admin.from('conversations').update({
      ai_enabled: true,
      status: 'open',
      ai_paused_by: null,
      updated_at: new Date().toISOString(),
    }).eq('id', conversation_id)

    return NextResponse.json({ success: true, ai_enabled: true })
  }

  if (action === 'send_message') {
    // Human sends a message in the conversation
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

    const { data: convo } = await admin.from('conversations')
      .select('org_id, channel, contact_phone, contact_email')
      .eq('id', conversation_id).single()

    if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    // Send via channel
    if (convo.channel === 'sms' && convo.contact_phone) {
      const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
      const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
      const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || ''
      if (TWILIO_ACCOUNT_SID && !TWILIO_ACCOUNT_SID.startsWith('PLACEHOLDER')) {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: convo.contact_phone, From: TWILIO_PHONE_NUMBER, Body: message }),
        }).catch((error) => { console.error(error); })
      }
    } else if (convo.channel === 'email' && convo.contact_email) {
      const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ''
      if (SENDGRID_API_KEY && !SENDGRID_API_KEY.startsWith('PLACEHOLDER')) {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: convo.contact_email }] }],
            from: { email: process.env.GMAIL_USER || 'hello@usawrapco.com', name: 'USA Wrap Co' },
            subject: 'USA Wrap Co',
            content: [{ type: 'text/html', value: `<p>${message}</p>` }],
          }),
        }).catch((error) => { console.error(error); })
      }
    }

    // Log message
    await admin.from('messages').insert({
      org_id: convo.org_id,
      conversation_id,
      direction: 'outbound',
      content: message,
      channel: convo.channel,
    })

    await admin.from('conversations').update({
      updated_at: new Date().toISOString(),
    }).eq('id', conversation_id)

    return NextResponse.json({ success: true })
  }

  if (action === 'close') {
    await admin.from('conversations').update({
      status: 'closed',
      updated_at: new Date().toISOString(),
    }).eq('id', conversation_id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
