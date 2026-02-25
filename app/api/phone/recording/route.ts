import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.formData()

  const callSid = body.get('CallSid') as string
  const recordingUrl = body.get('RecordingUrl') as string
  const recordingSid = body.get('RecordingSid') as string

  await supabase.from('call_logs')
    .update({
      recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
      recording_sid: recordingSid,
    })
    .eq('twilio_call_sid', callSid)

  return new NextResponse('OK')
}
