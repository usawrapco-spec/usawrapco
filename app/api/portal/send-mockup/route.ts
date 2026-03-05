import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { image_url, method, recipient, note, project_id, vehicle } = await req.json()
    if (!image_url || !method || !recipient) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

    // If project_id, create a design proof record for the mockup
    let proofToken = ''
    if (project_id) {
      const { data: proof } = await admin
        .from('design_proofs')
        .insert({
          project_id,
          version: 1,
          image_url,
          status: 'pending',
          notes: note || 'AI-generated mockup for your review',
          created_by: user.id,
        })
        .select('id, token')
        .single()

      if (proof?.token) proofToken = proof.token
    }

    const viewUrl = proofToken
      ? `${appUrl}/proof/${proofToken}`
      : image_url

    const firstName = recipient.includes('@') ? '' : ''

    // ── SMS ──────────────────────────────────────────────────────────────
    if (method === 'sms') {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID
      const twilioAuth = process.env.TWILIO_AUTH_TOKEN
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER
      if (!twilioSid || !twilioAuth || !twilioFrom) {
        return NextResponse.json({ error: 'SMS not configured' }, { status: 503 })
      }

      let smsBody = `USA Wrap Co — Here's a mockup for your ${vehicle || 'vehicle wrap'}!`
      if (note) smsBody += ` ${note}`
      smsBody += `\n\nView & mark up your design: ${viewUrl}`

      const params = new URLSearchParams({ To: recipient, From: twilioFrom, Body: smsBody })
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64')}`,
          },
          body: params.toString(),
        }
      )
      if (!twilioRes.ok) {
        const err = await twilioRes.text()
        console.error('[send-mockup] Twilio error:', err)
        return NextResponse.json({ error: 'Failed to send SMS' }, { status: 502 })
      }

      return NextResponse.json({ ok: true })
    }

    // ── Email ────────────────────────────────────────────────────────────
    const RESEND_KEY = process.env.RESEND_API_KEY
    if (!RESEND_KEY) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Inter, system-ui, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
  .card { background: #fff; border-radius: 16px; max-width: 520px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  .header { background: #0d0f14; padding: 28px 32px; text-align: center; }
  .logo { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: 2px; }
  .body { padding: 32px; }
  h2 { font-size: 22px; color: #0f172a; margin: 0 0 12px; }
  p { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px; }
  .btn { display: inline-block; background: #4f7fff; color: #fff !important; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; margin: 8px 0 20px; }
  .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">USA WRAP CO</div>
    <div style="color:#9299b5; font-size:13px; margin-top:6px;">Design Mockup</div>
  </div>
  <div class="body">
    <h2>Your vehicle wrap mockup is ready!</h2>
    ${note ? `<p>${note}</p>` : ''}
    <p>We've created a custom mockup for your ${vehicle || 'vehicle wrap'}. Click below to view it and add any feedback or markups directly on the design.</p>
    <img src="${image_url}" alt="Vehicle wrap mockup" style="width:100%; border-radius:12px; margin:16px 0;" />
    <div style="text-align:center">
      <a href="${viewUrl}" class="btn">View & Mark Up Design</a>
    </div>
    <p style="font-size:13px; color:#94a3b8;">You can draw arrows, circles, and add text comments directly on the mockup to share your feedback.</p>
  </div>
  <div class="footer">
    USA Wrap Co &bull; 4124 124th St NW, Gig Harbor, WA 98332<br>
    253-525-8148 &bull; sales@usawrapco.com
  </div>
</div>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'USA Wrap Co <noreply@usawrapco.com>',
        to: recipient,
        subject: `Your vehicle wrap mockup — ${vehicle || 'USA Wrap Co'}`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      console.error('[send-mockup] Resend error:', err)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-mockup]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
