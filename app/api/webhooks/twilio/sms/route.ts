import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

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
    const body = (formData.get('Body') as string) || ''
    const messageSid = formData.get('MessageSid') as string
    const numMedia = parseInt((formData.get('NumMedia') as string) || '0', 10)

    if (!from) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 400, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const supabase = getSupabaseAdmin()

    // Collect MMS media URLs
    const mediaUrls: string[] = []
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = formData.get(`MediaUrl${i}`) as string
      if (mediaUrl) mediaUrls.push(mediaUrl)
    }

    // 1. Find or create customer by phone number
    const cleanPhone = from.replace(/\D/g, '')
    let { data: customer } = await supabase
      .from('customers')
      .select('id, name, phone')
      .or(`phone.eq.${from},phone.eq.+1${cleanPhone.slice(-10)},phone.eq.${cleanPhone.slice(-10)}`)
      .eq('org_id', ORG_ID)
      .limit(1)
      .maybeSingle()

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          org_id: ORG_ID,
          name: `Unknown (${from})`,
          phone: from,
        })
        .select()
        .single()
      customer = newCustomer
    }

    if (!customer) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // 2. Find or create conversation (for CommHubClient inbox)
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id, status, unread_count')
      .eq('org_id', ORG_ID)
      .eq('customer_id', customer.id)
      .eq('last_message_channel', 'sms')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!conversation) {
      const { data: newConvo } = await supabase
        .from('conversations')
        .insert({
          org_id: ORG_ID,
          customer_id: customer.id,
          contact_name: customer.name || from,
          contact_phone: from,
          status: 'open',
          last_message_at: new Date().toISOString(),
          last_message_preview: body.substring(0, 100),
          last_message_channel: 'sms',
          unread_count: 1,
        })
        .select()
        .single()
      conversation = newConvo
    } else {
      await supabase
        .from('conversations')
        .update({
          status: 'open',
          last_message_at: new Date().toISOString(),
          last_message_preview: body.substring(0, 100),
          last_message_channel: 'sms',
          unread_count: ((conversation as any).unread_count || 0) + 1,
        })
        .eq('id', conversation.id)
    }

    if (!conversation) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // 3. Save inbound message to conversation_messages
    await supabase.from('conversation_messages').insert({
      conversation_id: conversation.id,
      channel: 'sms',
      direction: 'inbound',
      body,
      attachments: mediaUrls.length > 0 ? mediaUrls.map((u) => ({ url: u, type: 'image' })) : null,
      status: 'received',
      sender_name: customer.name || from,
    })

    // 4. Also write to legacy communications table
    await supabase.from('communications').insert({
      org_id: ORG_ID,
      channel: 'sms',
      direction: 'inbound',
      customer_id: customer.id,
      from_address: from,
      to_address: to,
      body,
      twilio_message_sid: messageSid,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      status: 'received',
      created_at: new Date().toISOString(),
    })

    // 5. Log to activity_log
    if (customer.id) {
      await supabase
        .from('activity_log')
        .insert({
          org_id: ORG_ID,
          actor_id: customer.id,
          action: 'inbound_sms',
          entity_type: 'customer',
          entity_id: customer.id,
          details: { message: body.length > 200 ? body.substring(0, 200) + '...' : body, message_sid: messageSid, media_count: numMedia },
        })
    }

    // 6. Trigger AI auto-respond (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
    fetch(`${appUrl}/api/ai/auto-respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger_type: 'new_sms_inbound',
        conversation_id: conversation.id,
        customer_id: customer.id,
        org_id: ORG_ID,
        message_body: body,
      }),
    }).catch((error) => { console.error(error); })

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
