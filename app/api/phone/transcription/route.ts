import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { sendTransactionalEmail } from '@/lib/email/send'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.formData()
  if (!isTwilioWebhook(req, formDataToParams(body))) {
    return new NextResponse('Forbidden', { status: 403 })
  }


  const callSid = body.get('CallSid') as string
  const transcript = body.get('TranscriptionText') as string
  const recordingUrl = body.get('RecordingUrl') as string

  const { data: callLog } = await supabase.from('call_logs')
    .update({ voicemail_transcript: transcript })
    .eq('twilio_call_sid', callSid)
    .select('*, department:department_id(voicemail_email, name)')
    .maybeSingle()

  const deptEmail = callLog?.department?.voicemail_email || 'fleet@usawrapco.com'
  const deptName = callLog?.department?.name || 'General'

  if (deptEmail) {
    await sendTransactionalEmail({
      to: deptEmail,
      subject: `New Voicemail — ${deptName} Dept — from ${callLog?.from_number || 'Unknown'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a1a; color: white; padding: 24px; border-radius: 8px;">
            <h2 style="margin: 0 0 16px; color: #3b82f6;">New Voicemail</h2>
            <div style="background: #242424; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
              <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">FROM</p>
              <p style="margin: 0; font-size: 18px; font-weight: bold;">${callLog?.from_number || 'Unknown'}</p>
            </div>
            <div style="background: #242424; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
              <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">DEPARTMENT</p>
              <p style="margin: 0; font-weight: bold;">${deptName}</p>
            </div>
            <div style="background: #242424; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
              <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">TRANSCRIPT</p>
              <p style="margin: 0; line-height: 1.6; color: #e4e4e7;">"${transcript || 'No transcript available'}"</p>
            </div>
            ${recordingUrl ? `
            <a href="${recordingUrl}.mp3"
               style="display: block; background: #3b82f6; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Listen to Voicemail
            </a>` : ''}
            <p style="margin: 16px 0 0; color: #71717a; font-size: 12px; text-align: center;">
              USA Wrap Co Phone System &bull; ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}
            </p>
          </div>
        </div>
      `,
      emailType: 'voicemail_notification',
    })
  }

  // Update inbox conversation message with transcription
  if (callSid && transcript) {
    await supabase.from('conversation_messages')
      .update({ voicemail_transcription: transcript, body: transcript })
      .eq('twilio_sid', callSid)
      .eq('channel', 'voicemail')
  }

  return new NextResponse('OK', { status: 200 })
}
