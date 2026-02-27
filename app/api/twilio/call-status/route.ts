import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

/**
 * Twilio call status webhook
 * NO AUTH — called by Twilio when a call changes state or completes.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const callSid = form.get('CallSid') as string | null
    const callStatus = form.get('CallStatus') as string | null
    const duration = form.get('CallDuration') as string | null
    const recordingUrl = form.get('RecordingUrl') as string | null
    const from = form.get('From') as string | null
    const to = form.get('To') as string | null

    if (!callSid) {
      return new Response('ok', { status: 200 })
    }

    const admin = getSupabaseAdmin()

    // Map Twilio statuses to our status values
    const statusMap: Record<string, string> = {
      completed: 'completed',
      'no-answer': 'no_answer',
      busy: 'busy',
      failed: 'failed',
      canceled: 'canceled',
      initiated: 'initiated',
      ringing: 'ringing',
      'in-progress': 'in_progress',
    }
    const mappedStatus = statusMap[callStatus || ''] || callStatus || 'unknown'

    // Update call_logs
    const updateData: Record<string, unknown> = {
      status: mappedStatus,
    }
    if (duration) updateData.duration_seconds = parseInt(duration, 10)
    if (recordingUrl) updateData.recording_url = recordingUrl
    if (callStatus === 'completed' || callStatus === 'no-answer' || callStatus === 'busy' || callStatus === 'failed') {
      updateData.ended_at = new Date().toISOString()
    }

    await admin
      .from('call_logs')
      .update(updateData)
      .eq('twilio_call_sid', callSid)
      .eq('org_id', ORG_ID)

    // If missed call (no-answer / busy), flag it
    if (callStatus === 'no-answer' || callStatus === 'busy') {
      await admin
        .from('call_logs')
        .update({ missed_sms_sent: false })
        .eq('twilio_call_sid', callSid)
        .eq('org_id', ORG_ID)
        .is('missed_sms_sent', null)
    }

    return new Response('ok', { status: 200 })
  } catch (err: any) {
    console.error('[twilio/call-status] error:', err)
    return new Response('ok', { status: 200 })
  }
}
