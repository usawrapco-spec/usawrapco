import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// ── Resend event webhook ─────────────────────────────────────────
// Configure in Resend dashboard: resend.com → Webhooks → Add Endpoint
// URL:    https://usawrapco.com/api/email/resend-webhook
// Events: email.sent, email.delivered, email.opened, email.clicked,
//         email.bounced, email.complained, email.delivery_delayed
//
// Set RESEND_WEBHOOK_SECRET in Vercel env vars from Resend dashboard
// (Signing secret — looks like whsec_xxxxxxxx)
//
// Resend uses Svix for webhook delivery. Event format:
// { type: "email.opened", created_at: "...", data: { email_id, from, to, subject } }

// Verify Svix HMAC-SHA256 signature
function verifySignature(
  body: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  secret: string
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature || !secret) return false
  try {
    // Strip whsec_ prefix and base64-decode the key
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
    const toSign = `${svixId}.${svixTimestamp}.${body}`
    const hmac = crypto.createHmac('sha256', key).update(toSign).digest('base64')
    // Svix sends multiple signatures comma-separated: "v1,<sig> v1,<sig2>"
    const signatures = svixSignature.split(' ')
    return signatures.some((s) => {
      const sigValue = s.replace(/^v1,/, '')
      return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(sigValue))
    })
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const secret = process.env.RESEND_WEBHOOK_SECRET || ''

  // Verify signature when secret is configured
  if (secret) {
    const svixId = req.headers.get('svix-id')
    const svixTimestamp = req.headers.get('svix-timestamp')
    const svixSignature = req.headers.get('svix-signature')
    const valid = verifySignature(rawBody, svixId, svixTimestamp, svixSignature, secret)
    if (!valid) {
      console.warn('[resend-webhook] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: { type: string; data: { email_id: string; [key: string]: any } }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, data } = payload
  if (!type || !data?.email_id) {
    return NextResponse.json({ error: 'Missing type or email_id' }, { status: 400 })
  }

  const emailId = data.email_id
  const now = new Date().toISOString()
  const admin = getSupabaseAdmin()

  // Look up email_log by Resend message ID (stored as sendgrid_message_id for legacy compat)
  const { data: emailLog } = await admin
    .from('email_logs')
    .select('id, open_count')
    .eq('sendgrid_message_id', emailId)
    .maybeSingle()

  if (!emailLog) {
    // Try matching directly against conversation_messages
    const { data: msg } = await admin
      .from('conversation_messages')
      .select('id, open_count')
      .eq('sendgrid_message_id', emailId)
      .maybeSingle()

    if (!msg) {
      console.log('[resend-webhook] No match for email_id:', emailId, 'type:', type)
      return NextResponse.json({ received: true, matched: false })
    }

    // Update conversation_message directly (no email_log)
    await updateConversationMessage(admin, msg.id, msg.open_count, type, now)
    return NextResponse.json({ received: true, type, matched: true, source: 'conversation_message' })
  }

  // Update email_log
  await updateEmailLog(admin, emailLog.id, emailLog.open_count, type, now)

  // Update linked conversation_message
  const { data: msg } = await admin
    .from('conversation_messages')
    .select('id, open_count')
    .eq('email_log_id', emailLog.id)
    .maybeSingle()
  if (msg) {
    await updateConversationMessage(admin, msg.id, msg.open_count, type, now)
  }

  console.log('[resend-webhook] Processed:', type, 'for email_id:', emailId)
  return NextResponse.json({ received: true, type, matched: true })
}

async function updateEmailLog(
  admin: any,
  logId: string,
  currentOpenCount: number,
  type: string,
  now: string
) {
  switch (type) {
    case 'email.sent':
      await admin.from('email_logs').update({ status: 'sent' }).eq('id', logId)
      break
    case 'email.delivered':
      await admin.from('email_logs').update({ status: 'delivered' }).eq('id', logId)
      break
    case 'email.opened':
      await admin.from('email_logs').update({
        status: 'opened',
        opened_at: now,
        open_count: (currentOpenCount || 0) + 1,
      }).eq('id', logId)
      break
    case 'email.clicked':
      await admin.from('email_logs').update({ status: 'clicked' }).eq('id', logId)
      break
    case 'email.bounced':
      await admin.from('email_logs').update({ status: 'bounced' }).eq('id', logId)
      break
    case 'email.complained':
    case 'email.spam_complaint':
      await admin.from('email_logs').update({ status: 'spam' }).eq('id', logId)
      break
    case 'email.delivery_delayed':
      await admin.from('email_logs').update({ status: 'delayed' }).eq('id', logId)
      break
  }
}

async function updateConversationMessage(
  admin: any,
  msgId: string,
  currentOpenCount: number,
  type: string,
  now: string
) {
  switch (type) {
    case 'email.sent':
      await admin.from('conversation_messages').update({ status: 'sent' }).eq('id', msgId)
      break
    case 'email.delivered':
      await admin.from('conversation_messages').update({ status: 'delivered' }).eq('id', msgId)
      break
    case 'email.opened':
      await admin.from('conversation_messages').update({
        opened_at: now,
        open_count: (currentOpenCount || 0) + 1,
        status: 'opened',
      }).eq('id', msgId)
      break
    case 'email.clicked':
      await admin.from('conversation_messages').update({
        clicked_at: now,
        status: 'clicked',
      }).eq('id', msgId)
      break
    case 'email.bounced':
      await admin.from('conversation_messages').update({ status: 'bounced' }).eq('id', msgId)
      break
    case 'email.complained':
    case 'email.spam_complaint':
      await admin.from('conversation_messages').update({ status: 'spam' }).eq('id', msgId)
      break
    case 'email.delivery_delayed':
      await admin.from('conversation_messages').update({ status: 'delayed' }).eq('id', msgId)
      break
  }
}
