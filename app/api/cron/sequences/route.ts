import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('Authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  try {
    // Find all pending sequence step sends that are due
    const { data: pending } = await supabase
      .from('sequence_step_sends')
      .select(
        `
        *,
        sequence_steps(*),
        sequence_enrollments(
          id,
          customer_id,
          conversation_id,
          sequence_id
        )
      `
      )
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .limit(50)

    let sent = 0
    let errors = 0

    for (const stepSend of pending || []) {
      try {
        const step = stepSend.sequence_steps
        const enrollment = stepSend.sequence_enrollments
        if (!step || !enrollment) continue

        // Get customer
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name, phone, email, business')
          .eq('id', enrollment.customer_id)
          .single()

        if (!customer) continue

        // Replace template variables
        const body = (step.body || '')
          .replace(/\{\{name\}\}/g, customer.name?.split(' ')[0] || 'there')
          .replace(/\{\{business\}\}/g, customer.business || '')
          .replace(/\{\{phone\}\}/g, customer.phone || '')

        if (step.channel === 'sms' && customer.phone) {
          // Send via Twilio
          const accountSid = process.env.TWILIO_ACCOUNT_SID
          const authToken = process.env.TWILIO_AUTH_TOKEN
          const fromNumber = process.env.TWILIO_PHONE_NUMBER

          if (accountSid && authToken && fromNumber) {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
            const params = new URLSearchParams({
              To: customer.phone,
              From: fromNumber,
              Body: body,
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

            // Log message if conversation exists
            if (enrollment.conversation_id) {
              await supabase.from('conversation_messages').insert({
                conversation_id: enrollment.conversation_id,
                channel: 'sms',
                direction: 'outbound',
                body,
                sender_name: 'Sequence',
                status: 'sent',
              })

              await supabase
                .from('conversations')
                .update({
                  last_message_at: new Date().toISOString(),
                  last_message_preview: body.substring(0, 100),
                })
                .eq('id', enrollment.conversation_id)
            }
          }
        } else if (step.channel === 'email' && customer.email) {
          const resendKey = process.env.RESEND_API_KEY
          const sendgridKey = process.env.SENDGRID_API_KEY

          if (resendKey) {
            const { Resend } = await import('resend')
            const resend = new Resend(resendKey)
            await resend.emails.send({
              from: 'USA Wrap Co <fleet@usawrapco.com>',
              to: customer.email,
              subject: step.subject || 'Following up',
              html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
              text: body,
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
                from: { email: 'fleet@usawrapco.com', name: 'USA Wrap Co' },
                subject: step.subject || 'Following up',
                content: [
                  { type: 'text/plain', value: body },
                  {
                    type: 'text/html',
                    value: `<p>${body.replace(/\n/g, '<br>')}</p>`,
                  },
                ],
              }),
            })
          }
        }

        // Mark step as sent
        await supabase
          .from('sequence_step_sends')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', stepSend.id)

        // Schedule next step if any
        const { data: nextStep } = await supabase
          .from('sequence_steps')
          .select('*')
          .eq('sequence_id', step.sequence_id)
          .eq('step_number', (step.step_number || 0) + 1)
          .single()

        if (nextStep) {
          const nextTime = new Date()
          nextTime.setMinutes(
            nextTime.getMinutes() + (nextStep.delay_minutes || 1440)
          )
          await supabase.from('sequence_step_sends').insert({
            enrollment_id: stepSend.enrollment_id,
            step_id: nextStep.id,
            scheduled_at: nextTime.toISOString(),
            status: 'scheduled',
          })
        } else {
          // Sequence complete
          await supabase
            .from('sequence_enrollments')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', enrollment.id)
        }

        sent++
      } catch (e) {
        console.error('Sequence step error:', e)
        await supabase
          .from('sequence_step_sends')
          .update({ status: 'error', failed_reason: String(e) })
          .eq('id', stepSend.id)
        errors++
      }
    }

    return NextResponse.json({
      processed: pending?.length || 0,
      sent,
      errors,
    })
  } catch (error) {
    console.error('Sequence cron error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
