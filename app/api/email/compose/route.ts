import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

// ─── Token Refresh Helper ────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_at: string
} | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('[GMAIL COMPOSE] Cannot refresh token: missing Google OAuth env vars')
    return null
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[GMAIL COMPOSE] Token refresh failed:', errText)
      return null
    }

    const data = await res.json()
    return {
      access_token: data.access_token,
      expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    }
  } catch (err) {
    console.error('[GMAIL COMPOSE] Token refresh error:', err)
    return null
  }
}

// ─── Build RFC 2822 Email ────────────────────────────────────────────────────

function buildRawEmail(from: string, to: string, subject: string, body: string): string {
  const boundary = `boundary_${Date.now()}`
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body.replace(/<[^>]+>/g, ''), // Strip HTML for plain text part
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    body,
    '',
    `--${boundary}--`,
  ]

  const raw = lines.join('\r\n')
  // Gmail API requires URL-safe base64 encoding
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { emailAccountId, to, subject, body, customerId, jobId } = await req.json()

  if (!emailAccountId || !to || !subject || !body) {
    return NextResponse.json(
      { error: 'emailAccountId, to, subject, and body are required' },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()

  // Fetch email account
  const { data: account, error: accountErr } = await admin
    .from('email_accounts')
    .select('*')
    .eq('id', emailAccountId)
    .single()

  if (accountErr || !account) {
    return NextResponse.json({ error: 'Email account not found' }, { status: 404 })
  }

  // Verify user belongs to same org
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id, name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.org_id !== account.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if token needs refresh
  let accessToken = account.access_token
  const tokenExpiry = new Date(account.token_expires_at)
  const now = new Date()

  if (tokenExpiry <= now || tokenExpiry.getTime() - now.getTime() < 60000) {
    if (!account.refresh_token) {
      await admin
        .from('email_accounts')
        .update({ status: 'expired' })
        .eq('id', emailAccountId)
      return NextResponse.json(
        { error: 'Token expired. Please reconnect the Gmail account.' },
        { status: 401 }
      )
    }

    const refreshed = await refreshAccessToken(account.refresh_token)
    if (!refreshed) {
      await admin
        .from('email_accounts')
        .update({ status: 'expired' })
        .eq('id', emailAccountId)
      return NextResponse.json(
        { error: 'Token refresh failed. Please reconnect the account.' },
        { status: 401 }
      )
    }

    accessToken = refreshed.access_token
    await admin
      .from('email_accounts')
      .update({
        access_token: refreshed.access_token,
        token_expires_at: refreshed.expires_at,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailAccountId)
  }

  try {
    // Build the raw email
    const fromLine = account.display_name
      ? `${account.display_name} <${account.email}>`
      : account.email
    const raw = buildRawEmail(fromLine, to, subject, body)

    // Send via Gmail API
    const sendRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      }
    )

    if (!sendRes.ok) {
      const errText = await sendRes.text()
      console.error('[GMAIL COMPOSE] Send failed:', errText)
      return NextResponse.json({ error: 'Failed to send email via Gmail' }, { status: 502 })
    }

    const sendData = await sendRes.json()

    // Save sent email to emails table
    const { data: savedEmail } = await admin
      .from('emails')
      .insert({
        org_id: account.org_id,
        email_account_id: emailAccountId,
        gmail_message_id: sendData.id || null,
        gmail_thread_id: sendData.threadId || null,
        direction: 'outbound',
        from_email: account.email.toLowerCase(),
        from_name: account.display_name || account.email,
        to_email: to.toLowerCase(),
        to_name: to,
        subject,
        body_html: body,
        snippet: body.replace(/<[^>]+>/g, '').slice(0, 200),
        labels: ['SENT'],
        customer_id: customerId || null,
        job_id: jobId || null,
        sent_by: user.id,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    return NextResponse.json({
      success: true,
      emailId: savedEmail?.id || null,
      gmailMessageId: sendData.id,
    })
  } catch (err) {
    console.error('[GMAIL COMPOSE] Unexpected error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
