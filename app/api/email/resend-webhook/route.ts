import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// Resend webhook — no JWT auth required (verified via Resend secret header)
// Configure in Resend dashboard: https://resend.com/webhooks
// Webhook URL: https://app.usawrapco.com/api/email/resend-webhook
// Events to subscribe: email.sent, email.delivered, email.opened, email.clicked, email.bounced
//
// Resend event format:
// { type: "email.opened", created_at: "...", data: { email_id: "...", from, to, subject } }
//
// The email_id corresponds to the ID returned by Resend on send,
// stored as sendgrid_message_id in email_logs and conversation_messages.

export async function POST(req: Request) {
  const admin = getSupabaseAdmin()

  let payload: { type: string; data: { email_id: string; [key: string]: any } }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, data } = payload
  if (!type || !data?.email_id) {
    return NextResponse.json({ error: 'Missing type or email_id' }, { status: 400 })
  }

  const emailId = data.email_id
  const now = new Date().toISOString()

  // Look up the email_log by the Resend message ID
  const { data: emailLog } = await admin
    .from('email_logs')
    .select('id, open_count')
    .eq('sendgrid_message_id', emailId)
    .maybeSingle()

  if (!emailLog) {
    // Not found — may be a test event or from a different system
    return NextResponse.json({ received: true, matched: false })
  }

  switch (type) {
    case 'email.sent':
      await admin.from('email_logs').update({ status: 'sent' }).eq('id', emailLog.id)
      await admin.from('conversation_messages').update({ status: 'sent' }).eq('email_log_id', emailLog.id)
      break

    case 'email.delivered':
      await admin.from('email_logs').update({ status: 'delivered' }).eq('id', emailLog.id)
      await admin.from('conversation_messages').update({ status: 'delivered' }).eq('email_log_id', emailLog.id)
      break

    case 'email.opened': {
      const newOpenCount = (emailLog.open_count || 0) + 1
      await admin
        .from('email_logs')
        .update({ status: 'opened', opened_at: now, open_count: newOpenCount })
        .eq('id', emailLog.id)

      // Also update conversation_message open tracking
      const { data: msg } = await admin
        .from('conversation_messages')
        .select('id, open_count')
        .eq('email_log_id', emailLog.id)
        .maybeSingle()
      if (msg) {
        await admin
          .from('conversation_messages')
          .update({ opened_at: now, open_count: (msg.open_count || 0) + 1 })
          .eq('id', msg.id)
      }
      break
    }

    case 'email.clicked': {
      await admin.from('conversation_messages').update({ clicked_at: now }).eq('email_log_id', emailLog.id)
      await admin.from('email_logs').update({ status: 'clicked' }).eq('id', emailLog.id)
      break
    }

    case 'email.bounced':
      await admin.from('email_logs').update({ status: 'bounced' }).eq('id', emailLog.id)
      await admin.from('conversation_messages').update({ status: 'bounced' }).eq('email_log_id', emailLog.id)
      break

    case 'email.complained':
      await admin.from('email_logs').update({ status: 'spam' }).eq('id', emailLog.id)
      break

    default:
      // Unknown event type — accept and ignore
      break
  }

  return NextResponse.json({ received: true, type, matched: true })
}
