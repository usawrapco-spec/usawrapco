import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Twilio posts to this URL when a call status changes (ringing, answered, completed, etc.)
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const callSid = params.get('CallSid') || ''
    const callStatus = params.get('CallStatus') || ''
    const callDuration = params.get('CallDuration') || '0'
    const recordingUrl = params.get('RecordingUrl') || null

    console.log('[comms/call/webhook] CallSid:', callSid, 'Status:', callStatus, 'Duration:', callDuration)

    if (!callSid) {
      return NextResponse.json({ ok: true })
    }

    const admin = getSupabaseAdmin()

    // Map Twilio call status to our status values
    let status: string
    switch (callStatus) {
      case 'completed':
        status = 'delivered'
        break
      case 'no-answer':
      case 'busy':
      case 'failed':
      case 'canceled':
        status = 'failed'
        break
      default:
        status = 'sent'
    }

    const durationSeconds = parseInt(callDuration, 10) || 0

    const updatePayload: Record<string, unknown> = {
      status,
      call_duration_seconds: durationSeconds,
      body: durationSeconds > 0
        ? `Call completed — ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
        : `Call ${callStatus}`,
    }

    if (recordingUrl) {
      updatePayload.call_recording_url = recordingUrl
    }

    // Find and update the communications record by twilio_sid
    const { error } = await admin
      .from('communications')
      .update(updatePayload)
      .eq('twilio_sid', callSid)
      .eq('channel', 'call')

    if (error) {
      console.error('[comms/call/webhook] DB update error:', error)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[comms/call/webhook] error:', err)
    return NextResponse.json({ ok: true })
  }
}
