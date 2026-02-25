/**
 * lib/email/send.ts
 * Core transactional email sender — calls Supabase send-email edge function (Resend).
 * Logs to email_logs + creates/updates inbox conversation thread.
 * Server-side only.
 */
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export interface SendEmailOptions {
  to: string
  toName?: string
  subject: string
  html: string
  projectId?: string
  customerId?: string
  sentBy?: string
  emailType?: string
}

export interface SendEmailResult {
  success: boolean
  messageId: string | null
  conversationId: string | null
}

export async function sendTransactionalEmail(
  opts: SendEmailOptions
): Promise<SendEmailResult> {
  const admin = getSupabaseAdmin()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let messageId: string | null = null
  let success = false

  // 1. Call Resend via Supabase edge function
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'x-internal-secret': process.env.INTERNAL_SECRET || 'usawrapco-internal',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    })
    const data = await res.json()
    if (res.ok && data.id) {
      messageId = data.id
      success = true
    } else {
      console.error('[EMAIL] Resend edge function error:', data)
    }
  } catch (e) {
    console.error('[EMAIL] Edge function call failed:', e)
  }

  // 2. Log to email_logs
  await admin.from('email_logs').insert({
    org_id: ORG_ID,
    project_id: opts.projectId || null,
    customer_id: opts.customerId || null,
    sent_by: opts.sentBy || null,
    to_email: opts.to,
    to_name: opts.toName || null,
    from_email: 'shop@usawrapco.com',
    from_name: 'USA Wrap Co',
    subject: opts.subject,
    body_html: opts.html,
    email_type: opts.emailType || 'transactional',
    sendgrid_message_id: messageId,
    status: success ? 'sent' : 'logged',
    sent_at: new Date().toISOString(),
    reference_type: opts.projectId ? 'project' : 'customer',
    reference_id: opts.projectId || opts.customerId || null,
  })

  // 3. Find or create conversation for this contact
  let conversationId: string | null = null

  const { data: existingConvo } = await admin
    .from('conversations')
    .select('id')
    .eq('org_id', ORG_ID)
    .eq('contact_email', opts.to)
    .maybeSingle()

  if (existingConvo) {
    conversationId = existingConvo.id
  } else {
    const { data: newConvo } = await admin
      .from('conversations')
      .insert({
        org_id: ORG_ID,
        contact_email: opts.to,
        contact_name: opts.toName || opts.to,
        project_id: opts.projectId || null,
        customer_id: opts.customerId || null,
        status: 'open',
        last_message_at: new Date().toISOString(),
        last_message_preview: opts.subject,
        last_message_channel: 'email',
        unread_count: 0,
      })
      .select()
      .single()
    conversationId = newConvo?.id || null
  }

  // 4. Add message to conversation thread
  if (conversationId) {
    await admin.from('conversation_messages').insert({
      org_id: ORG_ID,
      conversation_id: conversationId,
      channel: 'email',
      direction: 'outbound',
      sent_by: opts.sentBy || null,
      subject: opts.subject,
      body: opts.subject,
      body_html: opts.html,
      sendgrid_message_id: messageId,
      status: success ? 'sent' : 'logged',
      open_count: 0,
    })

    await admin
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: opts.subject,
        last_message_channel: 'email',
      })
      .eq('id', conversationId)
  }

  return { success, messageId, conversationId }
}
