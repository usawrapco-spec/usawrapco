import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { conversation_id, customer_id, subject, body_html, body_text } =
      await req.json()

    const { data: customer } = await supabase
      .from('customers')
      .select('email, name')
      .eq('id', customer_id)
      .single()

    if (!customer?.email)
      return NextResponse.json({ error: 'No email address' }, { status: 400 })

    // Try Resend first, fall back to SendGrid
    const resendKey = process.env.RESEND_API_KEY
    const sendgridKey = process.env.SENDGRID_API_KEY

    let sentId = ''

    if (resendKey) {
      const resend = new Resend(resendKey)
      const { data: sent, error } = await resend.emails.send({
        from: 'USA Wrap Co <fleet@usawrapco.com>',
        to: customer.email,
        subject: subject || '(No subject)',
        html: body_html || `<p>${(body_text || '').replace(/\n/g, '<br>')}</p>`,
        text: body_text || '',
        replyTo: 'fleet@usawrapco.com',
      })
      if (error) {
        console.error('Resend error:', error)
        return NextResponse.json({ error }, { status: 500 })
      }
      sentId = sent?.id || ''
    } else if (sendgridKey) {
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: customer.email }] }],
          from: { email: 'fleet@usawrapco.com', name: 'USA Wrap Co' },
          reply_to: { email: 'fleet@usawrapco.com' },
          subject: subject || '(No subject)',
          content: [
            { type: 'text/plain', value: body_text || '' },
            {
              type: 'text/html',
              value: body_html || `<p>${(body_text || '').replace(/\n/g, '<br>')}</p>`,
            },
          ],
        }),
      })
      if (!sgRes.ok) {
        const err = await sgRes.text()
        console.error('SendGrid error:', err)
        return NextResponse.json({ error: 'SendGrid failed' }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'No email provider configured' }, { status: 500 })
    }

    // Save to conversation_messages
    await supabase.from('conversation_messages').insert({
      conversation_id,
      channel: 'email',
      direction: 'outbound',
      subject,
      body: body_text || '',
      body_html: body_html || '',
      sent_by: user.id,
      sender_name: 'Team',
      status: 'sent',
    })

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: (body_text || '').substring(0, 100),
        last_message_channel: 'email',
      })
      .eq('id', conversation_id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
