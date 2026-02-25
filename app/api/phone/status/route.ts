import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.formData()

  const callSid = body.get('CallSid') as string
  const callStatus = body.get('CallStatus') as string
  const duration = parseInt((body.get('CallDuration') as string) || '0')

  const updateMap: Record<string, string> = {
    'completed': 'completed',
    'busy': 'missed',
    'failed': 'missed',
    'no-answer': 'missed',
    'canceled': 'missed',
    'in-progress': 'in-progress',
  }

  const status = updateMap[callStatus] || callStatus

  await supabase.from('call_logs')
    .update({
      status,
      duration_seconds: duration || undefined,
      ended_at: ['completed', 'missed'].includes(status) ? new Date().toISOString() : undefined,
    })
    .eq('twilio_call_sid', callSid)

  return new NextResponse('OK')
}
