import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.formData()
  const callSid = body.get('CallSid') as string
  const { searchParams } = new URL(req.url)
  const deptId = searchParams.get('deptId')
  const waitSeconds = parseInt(searchParams.get('wait') || '0')

  const { data: config } = await supabase
    .from('phone_system')
    .select('max_queue_wait_seconds, hold_music_url')
    .eq('org_id', ORG_ID)
    .single()

  const maxWait = config?.max_queue_wait_seconds || 180
  const musicUrl = config?.hold_music_url || 'https://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3'

  if (waitSeconds >= maxWait) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Thank you for your patience. All agents are still busy.
    Please leave a message and we will call you right back.
  </Say>
  <Record
    action="/api/phone/voicemail?dept=${deptId}&amp;callSid=${callSid}"
    maxLength="120"
    transcribe="true"
    transcribeCallback="/api/phone/transcription"
    playBeep="true"
  />
</Response>`
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  const nextWait = waitSeconds + 30
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${waitSeconds === 0 ? '<Say voice="Polly.Joanna">All agents are currently busy. Please hold and your call will be answered shortly.</Say>' : ''}
  <Play loop="1">${musicUrl}</Play>
  <Redirect method="POST">/api/phone/hold?deptId=${deptId}&amp;callSid=${callSid}&amp;wait=${nextWait}</Redirect>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
