import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

// ─── Token Refresh Helper ────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_at: string
} | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('[GMAIL SYNC] Cannot refresh token: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET')
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
      console.error('[GMAIL SYNC] Token refresh failed:', errText)
      return null
    }

    const data = await res.json()
    return {
      access_token: data.access_token,
      expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    }
  } catch (err) {
    console.error('[GMAIL SYNC] Token refresh error:', err)
    return null
  }
}

// ─── Gmail API Helpers ───────────────────────────────────────────────────────

async function gmailFetch(url: string, accessToken: string) {
  return fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

function decodeBase64Url(str: string): string {
  // Gmail uses URL-safe base64 encoding
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return Buffer.from(base64, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  const h = headers.find((hdr) => hdr.name.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

function extractEmailAddress(raw: string): string {
  // Extract email from "Name <email@example.com>" or just "email@example.com"
  const match = raw.match(/<([^>]+)>/)
  return match ? match[1].toLowerCase() : raw.trim().toLowerCase()
}

function getBodyFromPayload(payload: any): string {
  // Direct body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }

  // Multipart: prefer text/html, fallback to text/plain
  if (payload.parts) {
    // Check nested multipart/alternative
    for (const part of payload.parts) {
      if (part.mimeType === 'multipart/alternative' && part.parts) {
        const htmlPart = part.parts.find((p: any) => p.mimeType === 'text/html')
        if (htmlPart?.body?.data) return decodeBase64Url(htmlPart.body.data)
        const textPart = part.parts.find((p: any) => p.mimeType === 'text/plain')
        if (textPart?.body?.data) return decodeBase64Url(textPart.body.data)
      }
    }

    // Top-level parts
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')
    if (htmlPart?.body?.data) return decodeBase64Url(htmlPart.body.data)

    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (textPart?.body?.data) return decodeBase64Url(textPart.body.data)
  }

  return ''
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  // Auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { accountId } = params

  // Fetch email account
  const { data: account, error: accountErr } = await admin
    .from('email_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (accountErr || !account) {
    return NextResponse.json({ error: 'Email account not found' }, { status: 404 })
  }

  // Ensure the user belongs to the same org
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
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
      // Mark account as needing reconnection
      await admin
        .from('email_accounts')
        .update({ status: 'expired' })
        .eq('id', accountId)
      return NextResponse.json(
        { error: 'Token expired and no refresh token available. Please reconnect.' },
        { status: 401 }
      )
    }

    const refreshed = await refreshAccessToken(account.refresh_token)
    if (!refreshed) {
      await admin
        .from('email_accounts')
        .update({ status: 'expired' })
        .eq('id', accountId)
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
      .eq('id', accountId)
  }

  try {
    let messageIds: string[] = []
    let newHistoryId: string | null = account.gmail_history_id

    if (account.gmail_history_id) {
      // Incremental sync using history ID
      const historyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${account.gmail_history_id}&historyTypes=messageAdded`
      const historyRes = await gmailFetch(historyUrl, accessToken)

      if (historyRes.status === 404) {
        // History ID expired, fall back to full list
        const listRes = await gmailFetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50',
          accessToken
        )
        const listData = await listRes.json()
        messageIds = (listData.messages || []).map((m: any) => m.id)

        // Get current history ID
        const profileRes = await gmailFetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/profile',
          accessToken
        )
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          newHistoryId = profileData.historyId
        }
      } else if (historyRes.ok) {
        const historyData = await historyRes.json()
        newHistoryId = historyData.historyId || account.gmail_history_id

        // Collect all message IDs from history
        const history = historyData.history || []
        for (const record of history) {
          if (record.messagesAdded) {
            for (const added of record.messagesAdded) {
              if (added.message?.id) {
                messageIds.push(added.message.id)
              }
            }
          }
        }
      } else {
        const errText = await historyRes.text()
        console.error('[GMAIL SYNC] History fetch failed:', errText)
        return NextResponse.json({ error: 'Failed to fetch email history' }, { status: 502 })
      }
    } else {
      // First sync: fetch recent messages
      const listRes = await gmailFetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50',
        accessToken
      )

      if (!listRes.ok) {
        const errText = await listRes.text()
        console.error('[GMAIL SYNC] Message list failed:', errText)
        return NextResponse.json({ error: 'Failed to list messages' }, { status: 502 })
      }

      const listData = await listRes.json()
      messageIds = (listData.messages || []).map((m: any) => m.id)

      // Get current history ID
      const profileRes = await gmailFetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        accessToken
      )
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        newHistoryId = profileData.historyId
      }
    }

    // Deduplicate
    messageIds = [...new Set(messageIds)]

    // Check which messages we already have
    if (messageIds.length > 0) {
      const { data: existing } = await admin
        .from('emails')
        .select('gmail_message_id')
        .eq('email_account_id', accountId)
        .in('gmail_message_id', messageIds)

      const existingIds = new Set((existing || []).map((e: any) => e.gmail_message_id))
      messageIds = messageIds.filter((id) => !existingIds.has(id))
    }

    // Pre-load customers for email matching
    const { data: customers } = await admin
      .from('customers')
      .select('id, email, name')
      .eq('org_id', account.org_id)
      .not('email', 'is', null)

    const customersByEmail = new Map<string, { id: string; name: string }>()
    if (customers) {
      for (const c of customers) {
        if (c.email) {
          customersByEmail.set(c.email.toLowerCase(), { id: c.id, name: c.name })
        }
      }
    }

    // Fetch and save each message
    let synced = 0
    let errors = 0

    for (const msgId of messageIds) {
      try {
        const msgRes = await gmailFetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
          accessToken
        )

        if (!msgRes.ok) {
          errors++
          continue
        }

        const msgData = await msgRes.json()
        const headers = msgData.payload?.headers || []

        const from = getHeader(headers, 'From')
        const to = getHeader(headers, 'To')
        const subject = getHeader(headers, 'Subject')
        const date = getHeader(headers, 'Date')
        const messageIdHeader = getHeader(headers, 'Message-ID')
        const body = getBodyFromPayload(msgData.payload)

        const fromEmail = extractEmailAddress(from)
        const toEmail = extractEmailAddress(to)
        const isInbound = toEmail === account.email.toLowerCase()
        const externalEmail = isInbound ? fromEmail : toEmail

        // Match to customer
        const matchedCustomer = customersByEmail.get(externalEmail)

        const threadId = msgData.threadId || null
        const labels = msgData.labelIds || []
        const snippet = msgData.snippet || ''

        await admin.from('emails').insert({
          org_id: account.org_id,
          email_account_id: accountId,
          gmail_message_id: msgId,
          gmail_thread_id: threadId,
          message_id_header: messageIdHeader || null,
          direction: isInbound ? 'inbound' : 'outbound',
          from_email: fromEmail,
          from_name: from.replace(/<[^>]+>/, '').trim() || fromEmail,
          to_email: toEmail,
          to_name: to.replace(/<[^>]+>/, '').trim() || toEmail,
          subject: subject || '(no subject)',
          body_html: body,
          snippet,
          labels,
          customer_id: matchedCustomer?.id || null,
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          created_at: new Date().toISOString(),
        })

        synced++
      } catch (msgErr) {
        console.error(`[GMAIL SYNC] Error processing message ${msgId}:`, msgErr)
        errors++
      }
    }

    // Update history ID and last synced timestamp
    await admin
      .from('email_accounts')
      .update({
        gmail_history_id: newHistoryId,
        last_synced_at: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)

    return NextResponse.json({
      success: true,
      synced,
      errors,
      total: messageIds.length,
    })
  } catch (err) {
    console.error('[GMAIL SYNC] Unexpected error:', err)
    return NextResponse.json({ error: 'Sync failed unexpectedly' }, { status: 500 })
  }
}
