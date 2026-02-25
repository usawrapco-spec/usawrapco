import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

function buildEmailHtml(body: string, photos: any[] = []): string {
  const nl2br = body.replace(/\n/g, '<br/>')
  const photoGrid =
    photos.length > 0
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      ${photos
        .reduce((rows: string[], p: any, i: number) => {
          if (i % 2 === 0) rows.push('')
          rows[rows.length - 1] += `<td style="padding:8px;width:50%;vertical-align:top;">
            <a href="${p.image_url}" style="display:block;">
              <img src="${p.image_url}" alt="${p.caption || 'Photo'}" style="width:100%;border-radius:8px;display:block;" />
            </a>
            ${p.caption ? `<p style="font-size:13px;color:#666;margin:4px 0 0;text-align:center;">${p.caption}</p>` : ''}
          </td>`
          return rows
        }, [])
        .map(r => `<tr>${r}</tr>`)
        .join('')}
    </table>`
      : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#13151c;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
        <tr><td style="background:#0d0f14;padding:24px;text-align:center;">
          <img src="https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp" alt="USA Wrap Co" style="height:48px;width:auto;" />
        </td></tr>
        <tr><td style="padding:32px 28px;font-size:15px;line-height:1.6;color:#e8eaed;">
          ${nl2br}
          ${photoGrid}
        </td></tr>
        <tr><td style="background:#0d0f14;padding:16px 28px;font-size:12px;color:#5a6080;text-align:center;border-top:1px solid #1a1d27;">
          <p style="margin:0;">USA Wrap Co &middot; Tacoma, WA</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const orgId = profile.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'
  const {
    conversation_id,
    channel = 'email',
    to_email,
    to_phone,
    subject,
    body,
    body_html,
    photos = [],
    contact_name,
    customer_id,
    project_id,
    cc = [],
    bcc = [],
  } = await req.json()

  // ── Get or create conversation ──────────────────────────────
  let convoId = conversation_id
  if (!convoId) {
    const { data: newConvo, error } = await admin
      .from('conversations')
      .insert({
        org_id: orgId,
        customer_id: customer_id || null,
        project_id: project_id || null,
        contact_name: contact_name || to_email || to_phone || 'Unknown',
        contact_email: to_email || null,
        contact_phone: to_phone || null,
        status: 'open',
        assigned_to: user.id,
        unread_count: 0,
        last_message_channel: channel,
        is_starred: false,
        is_archived: false,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    convoId = newConvo.id
  }

  let emailLogId: string | null = null
  let resendMessageId: string | null = null
  let twilioSid: string | null = null

  // ── Send via Resend edge function ───────────────────────────
  if (channel === 'email' && to_email) {
    const emailHtml = body_html || buildEmailHtml(body || '', photos)

    try {
      const edgeRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'x-internal-secret': process.env.INTERNAL_SECRET || 'usawrapco-internal',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: to_email,
            subject: subject || 'Message from USA Wrap Co',
            html: emailHtml,
            cc: cc.length > 0 ? cc : undefined,
            bcc: bcc.length > 0 ? bcc : undefined,
          }),
        }
      )
      const edgeData = await edgeRes.json()
      if (edgeData.id) resendMessageId = edgeData.id
      if (!edgeRes.ok) {
        console.error('[COMMS] Resend send failed:', edgeData)
      }
    } catch (err) {
      console.error('[COMMS] Edge function call failed:', err)
    }

    // Log to email_logs
    const { data: emailLog } = await admin
      .from('email_logs')
      .insert({
        org_id: orgId,
        project_id: project_id || null,
        customer_id: customer_id || null,
        sent_by: user.id,
        to_email,
        to_name: contact_name || null,
        from_email: 'shop@usawrapco.com',
        from_name: 'USA Wrap Co',
        subject: subject || '',
        body_html: emailHtml,
        email_type: 'manual',
        status: resendMessageId ? 'sent' : 'logged',
        sent_at: new Date().toISOString(),
        sendgrid_message_id: resendMessageId,
        reference_id: convoId,
        reference_type: 'conversation',
      })
      .select()
      .single()
    emailLogId = emailLog?.id || null
  }

  // ── Send via Twilio SMS ─────────────────────────────────────
  if (channel === 'sms' && to_phone) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromPhone = process.env.TWILIO_PHONE_NUMBER

    if (
      accountSid &&
      !accountSid.startsWith('PLACEHOLDER') &&
      authToken &&
      fromPhone
    ) {
      try {
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization:
                'Basic ' +
                Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: to_phone,
              From: fromPhone,
              Body: body || '',
            }).toString(),
          }
        )
        const twilioData = await twilioRes.json()
        twilioSid = twilioData.sid || null
        if (!twilioRes.ok) {
          console.error('[COMMS] Twilio send failed:', twilioData)
        }
      } catch (err) {
        console.error('[COMMS] Twilio call failed:', err)
      }
    } else {
      console.log('[COMMS] Twilio not configured — SMS logged only')
    }
  }

  // ── Create conversation message ─────────────────────────────
  const preview = (body || subject || '').slice(0, 120)
  const { data: msg, error: msgError } = await admin
    .from('conversation_messages')
    .insert({
      org_id: orgId,
      conversation_id: convoId,
      channel,
      direction: channel === 'note' ? 'internal' : 'outbound',
      sent_by: user.id,
      sent_by_name: profile.name || null,
      subject: subject || null,
      body: body || '',
      body_html:
        body_html ||
        (channel === 'email' ? buildEmailHtml(body || '', photos) : null),
      email_log_id: emailLogId,
      sendgrid_message_id: resendMessageId,
      twilio_sid: twilioSid,
      status: channel === 'note' ? 'internal' : 'sent',
      open_count: 0,
      cc: cc.length > 0 ? cc : null,
      bcc: bcc.length > 0 ? bcc : null,
    })
    .select()
    .single()
  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })

  // ── Save photo selections ──────────────────────────────────
  if (photos.length > 0 && msg) {
    const photoInserts = photos.map((p: any, i: number) => ({
      conversation_message_id: msg.id,
      job_image_id: p.job_image_id || null,
      image_url: p.image_url,
      caption: p.caption || null,
      display_order: i,
    }))
    await admin.from('email_photo_selections').insert(photoInserts)
  }

  // ── Update conversation ────────────────────────────────────
  await admin
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: preview,
      last_message_channel: channel,
      status: 'open',
    })
    .eq('id', convoId)

  return NextResponse.json({
    success: true,
    conversation_id: convoId,
    message: msg,
    email_sent: !!resendMessageId,
    sms_sent: !!twilioSid,
  })
}
