import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Twilio sends form-encoded POST when a customer sends an SMS/MMS
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const params = new URLSearchParams(rawBody)

    const from         = params.get('From')        || ''
    const to           = params.get('To')          || ''
    const messageBody  = params.get('Body')        || ''
    const messageSid   = params.get('MessageSid')  || ''
    const numMedia     = parseInt(params.get('NumMedia') || '0', 10)

    // Collect MMS media URLs
    const mediaUrls: string[] = []
    for (let i = 0; i < numMedia; i++) {
      const url = params.get(`MediaUrl${i}`)
      if (url) mediaUrls.push(url)
    }

    // Optional signature validation
    const webhookSecret = process.env.TWILIO_WEBHOOK_SECRET
    const accountSid   = process.env.TWILIO_ACCOUNT_SID
    if (accountSid && webhookSecret) {
      const signature  = req.headers.get('x-twilio-signature') || ''
      const appUrl     = process.env.NEXT_PUBLIC_APP_URL || ''
      const webhookUrl = `${appUrl}/api/comms/sms/webhook`
      const sortedStr  = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce((s, [k, v]) => s + k + v, webhookUrl)
      const crypto     = await import('crypto')
      const expected   = crypto
        .createHmac('sha1', webhookSecret)
        .update(sortedStr)
        .digest('base64')
      if (`sha1=${expected}` !== signature && expected !== signature) {
        console.warn('[sms/webhook] Signature mismatch')
      }
    }

    const admin = getSupabaseAdmin()

    // ── 1. Resolve customer + project ───────────────────────────
    let customerId: string | null = null
    let projectId:  string | null = null
    let contactName = from

    const { data: customer } = await admin
      .from('customers')
      .select('id, name, contact_name')
      .or(`phone.eq.${from},mobile.eq.${from}`)
      .maybeSingle()

    if (customer) {
      customerId  = customer.id
      contactName = customer.contact_name || customer.name || from

      const { data: recentProject } = await admin
        .from('projects')
        .select('id')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentProject) projectId = recentProject.id
    }

    // Fall back: check recent outbound SMS to this number
    if (!customerId) {
      const { data: prev } = await admin
        .from('communications')
        .select('customer_id, project_id')
        .eq('to_number', from)
        .eq('channel', 'sms')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (prev) {
        customerId = prev.customer_id
        projectId  = prev.project_id
      }
    }

    // ── 2. Write to legacy `communications` table ────────────────
    await admin.from('communications').insert({
      org_id:      ORG_ID,
      customer_id: customerId,
      project_id:  projectId,
      direction:   'inbound',
      channel:     'sms',
      body:        messageBody,
      to_number:   to,
      from_number: from,
      status:      'received',
      twilio_sid:  messageSid,
    })

    // ── 3. Find or create conversation by phone ──────────────────
    let convoId: string | null = null

    // Look for an existing open conversation matching this phone
    const { data: existingConvo } = await admin
      .from('conversations')
      .select('id, unread_count')
      .eq('org_id', ORG_ID)
      .eq('contact_phone', from)
      .not('is_archived', 'eq', true)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingConvo) {
      convoId = existingConvo.id

      // Update last_message and increment unread
      await admin
        .from('conversations')
        .update({
          last_message_at:      new Date().toISOString(),
          last_message_preview: messageBody.slice(0, 120) || (mediaUrls.length > 0 ? '[MMS photo]' : ''),
          last_message_channel: 'sms',
          status:               'open',
          unread_count:         (existingConvo.unread_count || 0) + 1,
        })
        .eq('id', convoId)
    } else {
      // Create a new conversation
      const { data: newConvo, error: convoErr } = await admin
        .from('conversations')
        .insert({
          org_id:               ORG_ID,
          customer_id:          customerId,
          project_id:           projectId,
          contact_name:         contactName,
          contact_phone:        from,
          contact_email:        null,
          status:               'open',
          unread_count:         1,
          last_message_at:      new Date().toISOString(),
          last_message_preview: messageBody.slice(0, 120) || (mediaUrls.length > 0 ? '[MMS photo]' : ''),
          last_message_channel: 'sms',
          is_starred:           false,
          is_archived:          false,
        })
        .select()
        .single()

      if (convoErr) {
        console.error('[sms/webhook] Failed to create conversation:', convoErr)
      } else {
        convoId = newConvo.id
      }
    }

    // ── 4. Insert message into conversation_messages ─────────────
    if (convoId) {
      const preview = messageBody || (mediaUrls.length > 0 ? '[MMS photo]' : '')
      await admin.from('conversation_messages').insert({
        org_id:          ORG_ID,
        conversation_id: convoId,
        channel:         'sms',
        direction:       'inbound',
        body:            messageBody,
        media_urls:      mediaUrls.length > 0 ? mediaUrls : null,
        twilio_sid:      messageSid,
        status:          'received',
        open_count:      0,
      })
    }

    console.log('[sms/webhook] inbound SMS from:', from, 'body:', messageBody.slice(0, 50), 'media:', mediaUrls.length)

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (err: any) {
    console.error('[sms/webhook] error:', err)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
