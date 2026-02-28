import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { project_id, mockup_ids, send_sms, send_email, custom_message } =
      await req.json()

    // Get project + customer info
    const { data: project } = await supabase
      .from('projects')
      .select('*, customers(*)')
      .eq('id', project_id)
      .single()

    if (!project)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
    const proofToken = project.proof_token || project.id
    const proofLink = `${appUrl}/proof/${proofToken}`
    const customer = project.customers
    const vehicle = (project as any).vehicle_desc || ''
    const firstName = customer?.name?.split(' ')[0] || 'there'

    // Mark mockups as sent
    if (mockup_ids?.length) {
      await supabase
        .from('design_mockups')
        .update({
          sent_to_customer: true,
          sent_at: new Date().toISOString(),
        })
        .in('id', mockup_ids)
    }

    // Create design proof record
    await supabase
      .from('design_proofs')
      .insert({
        org_id: project.org_id,
        project_id,
        mockup_ids: mockup_ids || [],
        proof_token: proofToken,
        sent_at: new Date().toISOString(),
        customer_status: 'pending',
      })

    const message =
      custom_message ||
      `Hi ${firstName}! Your${vehicle ? ` ${vehicle}` : ''} wrap design is ready to review. Check it out and let us know what you think: ${proofLink}`

    // Send SMS
    if (send_sms && customer?.phone) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const fromNumber = process.env.TWILIO_PHONE_NUMBER

      if (accountSid && authToken && fromNumber) {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
        const params = new URLSearchParams({
          To: customer.phone,
          From: fromNumber,
          Body: message,
        })

        await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        })
      }
    }

    // Send Email
    if (send_email && customer?.email) {
      const resendKey = process.env.RESEND_API_KEY
      const sendgridKey = process.env.SENDGRID_API_KEY

      const emailHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#09090b;color:#fff;padding:32px;border-radius:16px;">
          <h2 style="color:#fff;margin:0 0 12px;">Your design is ready!</h2>
          <p style="color:#a1a1aa;">${custom_message || `Hi ${firstName}! Your wrap mockup is ready. Click below to review and approve (or request changes).`}</p>
          <a href="${proofLink}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:20px 0;">
            View Your Design
          </a>
          <p style="color:#52525b;font-size:13px;margin-top:24px;">
            Questions? Reply to this email or contact us at fleet@usawrapco.com
          </p>
        </div>
      `
      const emailSubject = `Your ${vehicle || 'wrap'} design is ready to review`

      if (resendKey) {
        const { Resend } = await import('resend')
        const resend = new Resend(resendKey)
        await resend.emails.send({
          from: 'USA Wrap Co Design Team <fleet@usawrapco.com>',
          to: customer.email,
          subject: emailSubject,
          html: emailHtml,
        })
      } else if (sendgridKey) {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: customer.email }] }],
            from: {
              email: 'fleet@usawrapco.com',
              name: 'USA Wrap Co Design Team',
            },
            subject: emailSubject,
            content: [{ type: 'text/html', value: emailHtml }],
          }),
        })
      }
    }

    return NextResponse.json({ ok: true, proof_link: proofLink })
  } catch (error) {
    console.error('Send proof error:', error)
    return NextResponse.json({ error: 'Failed to send proof' }, { status: 500 })
  }
}
