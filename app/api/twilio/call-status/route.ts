/**
 * POST /api/twilio/call-status
 * Twilio status callback — updates call_logs with duration, status, recording URL.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const params = formDataToParams(formData)

    if (!isTwilioWebhook(req, params)) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 403, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const callSid = formData.get('CallSid') as string
    const callStatus = formData.get('CallStatus') as string
    const callDuration = formData.get('CallDuration') as string | null
    const recordingUrl = formData.get('RecordingUrl') as string | null

    if (!callSid) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 400, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const admin = getSupabaseAdmin()

    const updates: Record<string, unknown> = {
      status: callStatus || 'completed',
    }

    if (callDuration) {
      updates.duration_seconds = parseInt(callDuration, 10)
    }

    if (recordingUrl) {
      updates.recording_url = recordingUrl
    }

    if (callStatus === 'completed' || callStatus === 'no-answer' || callStatus === 'busy' || callStatus === 'failed') {
      updates.ended_at = new Date().toISOString()
    }

    await admin
      .from('call_logs')
      .update(updates)
      .eq('twilio_call_sid', callSid)

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error) {
    console.error('[call-status] error:', error)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 500, headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
