import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  let body: FormData
  try {
    body = await req.formData()
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  if (!isTwilioWebhook(req, formDataToParams(body))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const digit = body.get('Digits') as string
    const callSid = body.get('CallSid') as string
    const from = body.get('From') as string

    if (digit === '0') {
      return routeToDepartment(supabase, null, callSid, from)
    }

    // * = extension dialing
    if (digit === '*') {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="3" action="/api/phone/extension?callSid=${callSid}" method="POST" timeout="10">
    <Say voice="Polly.Joanna">Please enter the 3-digit extension number now.</Say>
  </Gather>
  <Say voice="Polly.Joanna">No extension entered. Returning to main menu.</Say>
  <Redirect>/api/phone/incoming</Redirect>
</Response>`
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
    }

    const { data: dept } = await supabase
      .from('phone_departments')
      .select('*')
      .eq('org_id', ORG_ID)
      .eq('dtmf_key', digit)
      .eq('enabled', true)
      .single()

    if (!dept) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">That option is not available. Please call back and try again.</Say>
  <Hangup/>
</Response>`
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
    }

    await supabase.from('call_logs')
      .update({ department_id: dept.id, status: 'ringing' })
      .eq('twilio_call_sid', callSid)

    return routeToDepartment(supabase, dept, callSid, from)
  } catch (err: any) {
    console.error('[phone/menu] error:', err)
    const fallback = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>We're experiencing technical difficulties. Please try again.</Say><Hangup/></Response>`
    return new NextResponse(fallback, { headers: { 'Content-Type': 'text/xml' } })
  }
}

async function routeToDepartment(supabase: any, dept: any, callSid: string, from: string) {
  const deptId = dept?.id || null

  let agentQuery = supabase
    .from('phone_agents')
    .select('*')
    .eq('org_id', ORG_ID)
    .eq('is_available', true)
    .order('round_robin_order', { ascending: true })

  if (deptId) {
    agentQuery = agentQuery.eq('department_id', deptId)
  }

  const { data: agents } = await agentQuery

  if (!agents || agents.length === 0) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    All of our ${dept?.name || 'team'} members are currently unavailable.
    Please leave a message and we will return your call shortly.
  </Say>
  <Record
    action="/api/phone/voicemail?dept=${deptId || 'general'}&amp;callSid=${callSid}"
    maxLength="120"
    transcribe="true"
    transcribeCallback="/api/phone/transcription"
    playBeep="true"
  />
</Response>`
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  const startIndex = dept?.round_robin_index || 0
  const sortedAgents = [...agents].sort((a: any, b: any) => a.round_robin_order - b.round_robin_order)
  const rotated = [
    ...sortedAgents.slice(startIndex % sortedAgents.length),
    ...sortedAgents.slice(0, startIndex % sortedAgents.length),
  ]

  const numbers = rotated.flatMap((agent: any) => {
    const lines: string[] = []
    if (agent.cell_number) {
      lines.push(`<Number url="/api/phone/agent-connect?agentId=${agent.id}&amp;callSid=${callSid}">${agent.cell_number}</Number>`)
    }
    if (agent.profile_id) {
      lines.push(`<Client><Identity>${agent.profile_id}</Identity></Client>`)
    }
    return lines
  }).join('\n    ')

  if (dept?.id) {
    await supabase.from('phone_departments')
      .update({ round_robin_index: (startIndex + 1) % sortedAgents.length })
      .eq('id', dept.id)
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while we connect you to our ${dept?.name || 'team'}.</Say>
  <Dial
    action="/api/phone/call-complete?deptId=${deptId || 'general'}&amp;callSid=${callSid}"
    method="POST"
    timeout="25"
    record="record-from-answer"
    recordingStatusCallback="/api/phone/recording"
    ringTone="us"
  >
    ${numbers}
  </Dial>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
