import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const payload = await req.json()

    // Support both Resend and generic inbound webhook formats
    const from = payload.from || payload.sender
    const fromEmail = typeof from === 'string'
      ? from.match(/<(.+)>/)?.[1] || from
      : from?.email || ''
    const fromName = typeof from === 'string'
      ? from.match(/^(.+?)\s*</)?.[1]?.trim() || fromEmail
      : from?.name || fromEmail
    const subject = payload.subject || '(No subject)'
    const bodyText = payload.text || payload.plain || ''
    const bodyHtml = payload.html || ''
    const toEmail = Array.isArray(payload.to)
      ? payload.to[0]?.email || payload.to[0] || ''
      : payload.to || ''
    const messageId = payload.id || payload.message_id || ''

    // Save raw inbound email
    await supabase.from('inbound_emails').insert({
      org_id: ORG_ID,
      from_email: fromEmail,
      from_name: fromName,
      to_email: toEmail,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      raw_payload: payload,
      received_at: new Date().toISOString(),
    }).catch(() => {})

    // Find or create customer by email
    const normalizedEmail = fromEmail.toLowerCase().trim()
    if (!normalizedEmail) {
      return NextResponse.json({ ok: true, skipped: 'no email' })
    }

    let { data: customer } = await supabase
      .from('customers')
      .select('id, name, email')
      .ilike('email', normalizedEmail)
      .eq('org_id', ORG_ID)
      .limit(1)
      .single()

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          org_id: ORG_ID,
          name: fromName || fromEmail,
          email: normalizedEmail,
          status: 'lead',
          lead_source: 'inbound_email',
        })
        .select()
        .single()
      customer = newCustomer
    }

    if (!customer) {
      return NextResponse.json({ ok: true, skipped: 'customer creation failed' })
    }

    // Find or create email conversation for this customer
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('org_id', ORG_ID)
      .eq('customer_id', customer.id)
      .eq('last_message_channel', 'email')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!conversation) {
      const { data: newConvo } = await supabase
        .from('conversations')
        .insert({
          org_id: ORG_ID,
          customer_id: customer.id,
          contact_name: customer.name || fromName || fromEmail,
          contact_email: normalizedEmail,
          status: 'open',
          last_message_at: new Date().toISOString(),
          last_message_preview: bodyText.substring(0, 100),
          last_message_channel: 'email',
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
          last_message_preview: bodyText.substring(0, 100),
          unread_count: 1,
        })
        .eq('id', conversation.id)
    }

    if (!conversation) {
      return NextResponse.json({ ok: true, skipped: 'conversation creation failed' })
    }

    // Save message
    await supabase.from('conversation_messages').insert({
      conversation_id: conversation.id,
      channel: 'email',
      direction: 'inbound',
      subject,
      body: bodyText,
      body_html: bodyHtml,
      status: 'received',
      sender_name: fromName || fromEmail,
    })

    // Log to activity
    await supabase
      .from('activity_log')
      .insert({
        org_id: ORG_ID,
        customer_id: customer.id,
        actor_type: 'customer',
        actor_id: customer.id,
        actor_name: customer.name || fromEmail,
        action: 'inbound_email',
        details: subject,
        metadata: { message_id: messageId },
      })
      .catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Inbound email webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
