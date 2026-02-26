/** @deprecated Use /api/inbox/send */
import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, customer_id, project_id } = await req.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, org_id, name')
      .eq('id', user.id)
      .single()

    const orgId = profile?.org_id || ORG_ID
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@usawrapco.com'

    let resendId: string | null = null
    let status: 'sent' | 'failed' = 'sent'

    const resendKey = process.env.RESEND_API_KEY

    if (resendKey) {
      // Send via Resend REST API
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html: body.includes('<')
            ? body
            : `<p style="font-family:sans-serif;line-height:1.6;color:#333">${body.replace(/\n/g, '<br>')}</p>`,
        }),
      })

      const resendData = await resendRes.json()

      if (!resendRes.ok) {
        console.error('[comms/email/send] Resend error:', resendData)
        status = 'failed'
      } else {
        resendId = resendData.id
      }
    } else {
      // Demo mode
      console.log('[comms/email/send] Demo mode — Resend not configured. Would send to:', to)
    }

    // Log to communications table
    const { data: comm, error: insertError } = await admin
      .from('communications')
      .insert({
        org_id: orgId,
        customer_id: customer_id || null,
        project_id: project_id || null,
        direction: 'outbound',
        channel: 'email',
        subject,
        body,
        to_email: to,
        from_email: fromEmail,
        status,
        resend_id: resendId,
        sent_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[comms/email/send] DB insert error:', insertError)
    }

    return NextResponse.json({
      success: true,
      message_id: comm?.id,
      resend_id: resendId,
      status,
      demo: !resendKey,
    })
  } catch (err: any) {
    console.error('[comms/email/send] error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
