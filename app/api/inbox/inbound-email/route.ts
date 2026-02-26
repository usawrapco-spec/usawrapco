import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

// ── Resend inbound email webhook ────────────────────────────────────
// Configure in Resend dashboard: Domains → usawrapco.com → Inbound
// Webhook URL: https://your-vercel-domain.vercel.app/api/inbox/inbound-email
//
// Resend inbound payload:
// { type: 'email.received', data: { from, to, subject, text, html,
//   headers: [{ name, value }] } }

export async function POST(req: Request) {
  const rawBody = await req.text()

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data = payload.data || payload
  const type = payload.type

  // Only handle email.received events (or direct test POSTs without type)
  if (type && type !== 'email.received') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // ── Parse from address ──────────────────────────────────────────
  // Resend sends `from` as "Name <email@domain.com>" or "email@domain.com"
  const fromRaw: string = data.from || ''
  const fromMatch = fromRaw.match(/^(?:"?(.+?)"?\s+)?<?([^\s>]+@[^\s>]+)>?$/)
  const fromName = fromMatch?.[1]?.trim() || null
  const fromEmail = (fromMatch?.[2] || fromRaw).toLowerCase().trim()

  const subject: string = data.subject || ''
  const bodyText: string = data.text || data.body || ''
  const bodyHtml: string | null = data.html || null

  // Extract Message-ID and In-Reply-To from headers array for threading
  const headers: { name: string; value: string }[] = data.headers || []
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || null
  const messageId = getHeader('message-id') || null
  const inReplyTo = getHeader('in-reply-to') || null

  if (!fromEmail || !fromEmail.includes('@')) {
    return NextResponse.json({ error: 'No valid from address' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // ── Find or create conversation ──────────────────────────────────
  let convoId: string | null = null

  // 1. Match via In-Reply-To → find the outbound message we sent
  if (inReplyTo) {
    const { data: replyMsg } = await admin
      .from('conversation_messages')
      .select('conversation_id')
      .eq('email_message_id', inReplyTo)
      .maybeSingle()
    if (replyMsg) convoId = replyMsg.conversation_id
  }

  // 2. Match by contact_email in existing open conversations
  if (!convoId) {
    const { data: existing } = await admin
      .from('conversations')
      .select('id')
      .eq('org_id', ORG_ID)
      .ilike('contact_email', fromEmail)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    if (existing) convoId = existing.id
  }

  // 3. Create a brand-new conversation
  if (!convoId) {
    const { data: newConvo, error } = await admin
      .from('conversations')
      .insert({
        org_id: ORG_ID,
        contact_name: fromName || fromEmail,
        contact_email: fromEmail,
        status: 'open',
        unread_count: 0,
        last_message_channel: 'email',
        is_starred: false,
        is_archived: false,
      })
      .select()
      .single()
    if (error) {
      console.error('[INBOUND EMAIL] Failed to create conversation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    convoId = newConvo.id
  }

  // ── Insert the inbound message ───────────────────────────────────
  const preview = bodyText.slice(0, 120)
  const { error: msgError } = await admin.from('conversation_messages').insert({
    org_id: ORG_ID,
    conversation_id: convoId,
    channel: 'email',
    direction: 'inbound',
    subject: subject || null,
    body: bodyText,
    body_html: bodyHtml,
    status: 'delivered',
    email_message_id: messageId || null,
    open_count: 0,
  })
  if (msgError) {
    console.error('[INBOUND EMAIL] Failed to insert message:', msgError)
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  // ── Update conversation (last message + increment unread) ────────
  const { data: convo } = await admin
    .from('conversations')
    .select('unread_count')
    .eq('id', convoId)
    .single()

  await admin
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: preview,
      last_message_channel: 'email',
      status: 'open',
      unread_count: (convo?.unread_count || 0) + 1,
    })
    .eq('id', convoId)

  console.log('[INBOUND EMAIL] Received from', fromEmail, '→ convo', convoId)
  return NextResponse.json({ ok: true, conversation_id: convoId })
}
