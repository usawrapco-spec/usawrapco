import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { invoice_id, customer_phone, customer_email } = body
    if (!invoice_id) return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // Get profile + org
    const { data: profile } = await admin
      .from('profiles')
      .select('org_id, name')
      .eq('id', user.id)
      .single()
    const orgId = profile?.org_id
    if (!orgId) return NextResponse.json({ error: 'No org found' }, { status: 400 })

    // Get invoice with customer
    const { data: inv } = await admin
      .from('invoices')
      .select('*, customer:customer_id(id, name, email, phone)')
      .eq('id', invoice_id)
      .eq('org_id', orgId)
      .single()
    if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const balance = Math.max(0, inv.balance ?? (inv.total - inv.amount_paid))
    if (balance < 500) {
      return NextResponse.json({ error: 'Financing requires a minimum balance of $500' }, { status: 400 })
    }

    const cust = inv.customer as any
    const phone = customer_phone || cust?.phone || null
    const email = customer_email || cust?.email || null
    const customerName = cust?.name || 'Customer'
    const customerId = inv.customer_id

    // Build pay link URL using pay_link_token if available, else invoice id
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
    const token = inv.pay_link_token || invoice_id
    const payUrl = `${appUrl}/pay/${token}`
    const wisetackUrl = process.env.WISETACK_MERCHANT_URL || null

    // Estimate monthly payment (6-month 0% APR as the teaser rate)
    const monthlyEst = (balance / 6).toFixed(2)

    // Build message
    const smsBody =
      `Hi ${customerName}! Your USA WRAP CO invoice #${inv.invoice_number} is ready — $${balance.toFixed(2)} due.` +
      ` Finance from $${monthlyEst}/mo with 0% APR options.` +
      ` Pay here: ${payUrl}`

    const emailSubject = `Financing available for INV-${inv.invoice_number} — from $${monthlyEst}/mo`
    const emailBody = [
      `Hi ${customerName},`,
      ``,
      `Your USA WRAP CO invoice INV-${inv.invoice_number} has a balance of $${balance.toFixed(2)}.`,
      ``,
      `You can pay in full or finance starting from $${monthlyEst}/month with 0% APR options available.`,
      ``,
      `View & pay: ${payUrl}`,
      ``,
      wisetackUrl ? `To apply for financing directly: ${wisetackUrl}` : '',
      ``,
      `No credit impact to check your rate.`,
      ``,
      `— USA WRAP CO`,
    ].filter(l => l !== undefined).join('\n')

    let smsSent = false
    let emailSent = false
    const errors: string[] = []

    // ── SMS via Twilio ────────────────────────────────────────────────────────
    if (phone) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const fromPhone = process.env.TWILIO_PHONE_NUMBER

      if (accountSid && authToken && fromPhone) {
        try {
          const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                To: phone,
                From: fromPhone,
                Body: smsBody,
              }).toString(),
            }
          )
          smsSent = twilioRes.ok
          if (!twilioRes.ok) {
            const t = await twilioRes.text()
            errors.push(`SMS: ${t}`)
          }
        } catch (e: any) {
          errors.push(`SMS error: ${e.message}`)
        }
      }
    }

    // ── Email via Resend ──────────────────────────────────────────────────────
    if (email) {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        try {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'USA WRAP CO <noreply@usawrapco.com>',
              to: [email],
              subject: emailSubject,
              text: emailBody,
            }),
          })
          emailSent = resendRes.ok
          if (!resendRes.ok) {
            const t = await resendRes.text()
            errors.push(`Email: ${t}`)
          }
        } catch (e: any) {
          errors.push(`Email error: ${e.message}`)
        }
      } else {
        // Fallback: try SendGrid from integrations table
        try {
          const { data: sgInt } = await admin
            .from('integrations')
            .select('config, enabled')
            .eq('org_id', orgId)
            .eq('integration_id', 'sendgrid')
            .eq('enabled', true)
            .single()
          const sgConfig = sgInt?.config as any
          if (sgConfig?.api_key) {
            const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${sgConfig.api_key}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                personalizations: [{ to: [{ email, name: customerName }] }],
                from: { email: sgConfig.from_email || 'noreply@usawrapco.com', name: 'USA WRAP CO' },
                subject: emailSubject,
                content: [{ type: 'text/plain', value: emailBody }],
              }),
            })
            emailSent = sgRes.ok || sgRes.status === 202
          }
        } catch {}
      }
    }

    // ── Create / update financing_applications record ─────────────────────────
    const { data: finApp } = await admin
      .from('financing_applications')
      .insert({
        org_id: orgId,
        invoice_id,
        customer_id: customerId,
        customer_phone: phone,
        customer_email: email,
        invoice_number: String(inv.invoice_number),
        amount_requested: balance,
        status: 'sent',
        sent_at: new Date().toISOString(),
        merchant_ref: String(inv.invoice_number),
        created_by: user.id,
      })
      .select()
      .single()

    // Link the financing app to the invoice
    if (finApp) {
      await admin
        .from('invoices')
        .update({ financing_application_id: finApp.id })
        .eq('id', invoice_id)
    }

    // ── Log to communication_log ──────────────────────────────────────────────
    if (smsSent || emailSent) {
      try {
        await admin.from('communication_log').insert({
          org_id: orgId,
          customer_id: customerId,
          project_id: inv.project_id || null,
          type: smsSent ? 'sms' : 'email',
          direction: 'outbound',
          subject: `Financing link — INV-${inv.invoice_number}`,
          body: smsSent ? smsBody : emailBody,
          sent_by: user.id,
          status: 'sent',
        })
      } catch {}
    }

    return NextResponse.json({
      success: true,
      smsSent,
      emailSent,
      financing_application_id: finApp?.id || null,
      message: [
        smsSent && `SMS sent to ${phone}`,
        emailSent && `Email sent to ${email}`,
        !smsSent && !emailSent && 'Financing link logged. Configure Twilio/Resend to deliver automatically.',
      ].filter(Boolean).join('; '),
      errors: errors.length > 0 ? errors : undefined,
      payUrl,
    })
  } catch (err: any) {
    console.error('send-link error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
