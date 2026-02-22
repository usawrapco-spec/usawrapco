import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const GMAIL_USER = process.env.GMAIL_USER || ''
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ''

async function sendViaGmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!GMAIL_USER || GMAIL_USER.startsWith('PLACEHOLDER') || !GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD.startsWith('PLACEHOLDER')) {
    console.log('[EMAIL] Gmail not configured, logging instead:', { to, subject, body: body.slice(0, 200) })
    return true // Return true so the flow continues
  }

  // Use Nodemailer via dynamic import
  try {
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })

    await transporter.sendMail({
      from: `"USA Wrap Co" <${GMAIL_USER}>`,
      to,
      subject,
      html: body,
    })
    return true
  } catch (err) {
    console.error('[EMAIL] Send failed:', err)
    return false
  }
}

async function sendViaSendGrid(to: string, subject: string, body: string): Promise<boolean> {
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY.startsWith('PLACEHOLDER')) {
    return sendViaGmail(to, subject, body) // Fallback to Gmail
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: GMAIL_USER || 'hello@usawrapco.com', name: 'USA Wrap Co' },
        subject,
        content: [{ type: 'text/html', value: body }],
      }),
    })
    return res.ok
  } catch {
    return sendViaGmail(to, subject, body)
  }
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, subject, body, prospect_id, campaign_id, step_number } = await req.json()
  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'to, subject, body required' }, { status: 400 })
  }

  const success = await sendViaSendGrid(to, subject, body)
  const admin = getSupabaseAdmin()

  // Log to campaign_messages if part of a campaign
  if (campaign_id && prospect_id) {
    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
    await admin.from('campaign_messages').insert({
      org_id: profile?.org_id,
      campaign_id,
      prospect_id,
      step_number: step_number || 1,
      subject,
      body,
      status: success ? 'sent' : 'failed',
      sent_at: success ? new Date().toISOString() : null,
    }).catch(() => {})
  }

  return NextResponse.json({ success })
}
