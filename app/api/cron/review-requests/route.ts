import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// Cron job: Process queued review requests that are due
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !process.env.CRON_SECRET) {
    // Allow if no CRON_SECRET set (dev mode)
  } else if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const now = new Date().toISOString()

  // Get all queued review requests that are due
  const { data: pendingReviews } = await admin
    .from('review_requests')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(20)

  if (!pendingReviews || pendingReviews.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No pending review requests' })
  }

  let sent = 0
  let failed = 0

  for (const review of pendingReviews) {
    try {
      // Check if Twilio is configured
      const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER)

      // Build the message
      const firstName = (review.customer_name || '').split(' ')[0] || 'there'
      const template = review.message_template || 'Hi {first_name}! Your vehicle wrap from USA Wrap Co is complete. We\'d love your feedback! Leave us a Google review: {review_link}'
      const message = template
        .replace('{first_name}', firstName)
        .replace('{review_link}', review.google_review_link || '[Google Review Link]')

      let sentVia = ''

      // Send SMS via Twilio if configured and phone available
      if (hasTwilio && review.customer_phone && (review.method === 'sms' || review.method === 'both')) {
        try {
          const twilioSid = process.env.TWILIO_ACCOUNT_SID!
          const twilioAuth = process.env.TWILIO_AUTH_TOKEN!
          const twilioFrom = process.env.TWILIO_FROM_NUMBER!

          const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                To: review.customer_phone,
                From: twilioFrom,
                Body: message,
              }).toString(),
            }
          )

          if (twilioRes.ok) {
            sentVia = 'sms'
          } else {
            const errBody = await twilioRes.text()
            console.error('Twilio error:', errBody)
          }
        } catch (smsErr) {
          console.error('SMS send error:', smsErr)
        }
      }

      // Mark as sent (or keep queued if no delivery method worked)
      if (sentVia || !hasTwilio) {
        await admin
          .from('review_requests')
          .update({
            status: sentVia ? 'sent' : 'queued',
            sent_at: sentVia ? now : null,
            error_message: sentVia ? null : 'No Twilio configured - awaiting manual send',
            updated_at: now,
          })
          .eq('id', review.id)

        if (sentVia) sent++
      }
    } catch (err: any) {
      console.error(`Failed to process review ${review.id}:`, err)
      await admin
        .from('review_requests')
        .update({
          status: 'failed',
          error_message: err?.message || 'Unknown error',
          updated_at: now,
        })
        .eq('id', review.id)
      failed++
    }
  }

  return NextResponse.json({
    processed: pendingReviews.length,
    sent,
    failed,
    pending: pendingReviews.length - sent - failed,
  })
}
