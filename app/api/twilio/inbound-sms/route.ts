import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

/**
 * Twilio inbound SMS webhook
 * NO AUTH — called by Twilio. Must return TwiML or 200 quickly.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const from = (form.get('From') as string) || ''
    const body = (form.get('Body') as string) || ''
    const msgSid = (form.get('MessageSid') as string) || ''
    const numMedia = parseInt((form.get('NumMedia') as string) || '0', 10)

    const admin = getSupabaseAdmin()

    // Look up customer by phone number
    const normalizedPhone = from.replace(/[^\d+]/g, '')
    const { data: customer } = await admin
      .from('customers')
      .select('id, name')
      .or(
        `phone.eq.${from},phone.eq.${normalizedPhone},phone.eq.+1${normalizedPhone.slice(-10)}`
      )
      .eq('org_id', ORG_ID)
      .limit(1)
      .maybeSingle()

    // Find or create SMS conversation
    let { data: convo } = await admin
      .from('sms_conversations')
      .select('id, unread_count, ai_enabled')
      .eq('org_id', ORG_ID)
      .eq('contact_phone', from)
      .maybeSingle()

    const now = new Date().toISOString()

    if (!convo) {
      const { data: created } = await admin
        .from('sms_conversations')
        .insert({
          org_id: ORG_ID,
          contact_phone: from,
          contact_name: customer?.name || null,
          customer_id: customer?.id || null,
          last_message: body,
          last_message_at: now,
          unread_count: 1,
          ai_enabled: true,
          status: 'open',
        })
        .select('id, unread_count, ai_enabled')
        .single()
      convo = created
    } else {
      await admin
        .from('sms_conversations')
        .update({
          last_message: body,
          last_message_at: now,
          unread_count: (convo.unread_count || 0) + 1,
          ...(customer?.name ? { contact_name: customer.name } : {}),
          ...(customer?.id ? { customer_id: customer.id } : {}),
        })
        .eq('id', convo.id)
    }

    if (!convo) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    // Collect media URLs (MMS)
    const mediaUrls: string[] = []
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = form.get(`MediaUrl${i}`) as string | null
      if (mediaUrl) mediaUrls.push(mediaUrl)
    }

    // Insert message
    await admin.from('sms_messages').insert({
      conversation_id: convo.id,
      direction: 'inbound',
      body,
      from_number: from,
      twilio_sid: msgSid,
      ai_generated: false,
      status: 'received',
    })

    // Check if global AI is enabled
    const { data: aiSetting } = await admin
      .from('app_settings')
      .select('value')
      .eq('org_id', ORG_ID)
      .eq('key', 'ai_sms_enabled')
      .maybeSingle()

    const globalAiOn = aiSetting ? aiSetting.value === 'true' : true
    const convoAiOn = convo.ai_enabled !== false

    if (globalAiOn && convoAiOn && body.trim()) {
      // Fire and forget — AI auto-respond
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.usawrapco.com'
      fetch(`${siteUrl}/api/ai/auto-respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convo.id,
          inboundMessage: body,
          fromNumber: from,
          orgId: ORG_ID,
        }),
      }).catch(() => {})
    }

    // Return empty TwiML (no auto-reply via TwiML — we reply via REST API if AI is on)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err: any) {
    console.error('[twilio/inbound-sms] error:', err)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
