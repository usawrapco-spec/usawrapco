import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ''

function buildEmailHtml(body: string, photos: any[] = []): string {
  const nl2br = body.replace(/\n/g, '<br/>')
  const photoGrid =
    photos.length > 0
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      ${photos
        .reduce((rows: string[], p: any, i: number) => {
          if (i % 2 === 0) rows.push('')
          rows[rows.length - 1] += `<td style="padding:8px;width:50%;vertical-align:top;">
            <a href="${p.image_url}" target="_blank" style="display:block;">
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
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#0d0f14;padding:24px;text-align:center;">
          <img src="https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp" alt="USA Wrap Co" style="height:48px;width:auto;" />
        </td></tr>
        <tr><td style="padding:32px 28px;font-size:15px;line-height:1.6;color:#333333;">
          ${nl2br}
          ${photoGrid}
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 28px;font-size:12px;color:#999999;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;">USA Wrap Co &middot; Tacoma, WA</p>
          <p style="margin:4px 0 0;"><a href="#" style="color:#999;">Unsubscribe</a></p>
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
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
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
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    convoId = newConvo.id
  }

  let emailLogId: string | null = null
  let sgMessageId: string | null = null

  // ── Send via SendGrid ───────────────────────────────────────
  if (channel === 'email' && to_email) {
    const emailHtml = body_html || buildEmailHtml(body || '', photos)

    if (SENDGRID_API_KEY && !SENDGRID_API_KEY.startsWith('PLACEHOLDER')) {
      try {
        const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to_email }] }],
            from: { email: 'shop@usawrapco.com', name: 'USA Wrap Co' },
            subject: subject || 'Message from USA Wrap Co',
            content: [{ type: 'text/html', value: emailHtml }],
            tracking_settings: {
              click_tracking: { enable: true },
              open_tracking: { enable: true },
            },
          }),
        })
        sgMessageId = sgRes.headers.get('x-message-id') || null
      } catch (err) {
        console.error('[COMMS] SendGrid send failed:', err)
      }
    } else {
      console.log('[COMMS] SendGrid not configured, logging email:', {
        to_email,
        subject,
      })
    }

    // Log to email_logs
    const { data: emailLog } = await admin
      .from('email_logs')
      .insert({
        org_id: orgId,
        to_email,
        subject: subject || '',
        status: sgMessageId ? 'sent' : 'logged',
        sent_at: new Date().toISOString(),
        sendgrid_message_id: sgMessageId,
        reference_id: convoId,
        reference_type: 'conversation',
      })
      .select()
      .single()
    emailLogId = emailLog?.id || null
  }

  // ── Create conversation message ─────────────────────────────
  const preview = (body || subject || '').slice(0, 120)
  const { data: msg, error: msgError } = await admin
    .from('conversation_messages')
    .insert({
      conversation_id: convoId,
      channel,
      direction: channel === 'note' ? 'internal' : 'outbound',
      sent_by: user.id,
      subject: subject || null,
      body: body || '',
      body_html: body_html || (channel === 'email' ? buildEmailHtml(body || '', photos) : null),
      email_log_id: emailLogId,
      status: channel === 'note' ? 'internal' : 'sent',
      open_count: 0,
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
  })
}
