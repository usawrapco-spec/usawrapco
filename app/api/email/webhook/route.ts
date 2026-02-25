import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// SendGrid event webhook — no JWT / no auth required
export async function POST(req: Request) {
  const admin = getSupabaseAdmin()

  let events: any[]
  try {
    events = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'Expected array of events' }, { status: 400 })
  }

  let processed = 0

  for (const event of events) {
    // SendGrid sg_message_id can include a filter suffix — strip it
    const rawId = event.sg_message_id || ''
    const sgMessageId = rawId.includes('.') ? rawId.split('.')[0] : rawId
    if (!sgMessageId) continue

    // Find matching email_log
    const { data: emailLog } = await admin
      .from('email_logs')
      .select('id, open_count')
      .eq('sendgrid_message_id', sgMessageId)
      .single()

    if (!emailLog) continue

    // Insert raw event
    await admin.from('email_events').insert({
      email_log_id: emailLog.id,
      event_type: event.event,
      occurred_at: event.timestamp
        ? new Date(event.timestamp * 1000).toISOString()
        : new Date().toISOString(),
    })

    // Update email_log + conversation_message based on event type
    const now = new Date().toISOString()

    switch (event.event) {
      case 'delivered':
        await admin.from('email_logs').update({ status: 'delivered' }).eq('id', emailLog.id)
        await admin
          .from('conversation_messages')
          .update({ status: 'delivered' })
          .eq('email_log_id', emailLog.id)
        break

      case 'open': {
        const newCount = (emailLog.open_count || 0) + 1
        await admin
          .from('email_logs')
          .update({ status: 'opened', opened_at: now, open_count: newCount })
          .eq('id', emailLog.id)

        const { data: msg } = await admin
          .from('conversation_messages')
          .select('open_count')
          .eq('email_log_id', emailLog.id)
          .single()
        if (msg) {
          await admin
            .from('conversation_messages')
            .update({ opened_at: now, open_count: (msg.open_count || 0) + 1 })
            .eq('email_log_id', emailLog.id)
        }
        break
      }

      case 'click':
        await admin
          .from('conversation_messages')
          .update({ clicked_at: now })
          .eq('email_log_id', emailLog.id)
        break

      case 'bounce':
        await admin.from('email_logs').update({ status: 'bounced' }).eq('id', emailLog.id)
        await admin
          .from('conversation_messages')
          .update({ status: 'bounced' })
          .eq('email_log_id', emailLog.id)
        break

      case 'spamreport':
        await admin.from('email_logs').update({ status: 'spam' }).eq('id', emailLog.id)
        break
    }

    processed++
  }

  return NextResponse.json({ processed })
}
