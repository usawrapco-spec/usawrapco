import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

// Handles caller pressing * then entering a 3-digit extension
export async function POST(req: NextRequest) {
  const body = await req.formData()
  if (!isTwilioWebhook(req, formDataToParams(body))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const callSid = searchParams.get('callSid') || (body.get('CallSid') as string)
  const ext = (body.get('Digits') as string || '').trim()

  if (!ext) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">No extension received. Returning to main menu.</Say>
  <Redirect method="POST">${APP_URL}/api/phone/incoming</Redirect>
</Response>`
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  const { data: agent } = await supabase
    .from('phone_agents')
    .select('*, profile:profile_id(name)')
    .eq('org_id', ORG_ID)
    .eq('extension', ext)
    .eq('is_available', true)
    .single()

  if (!agent || !agent.cell_number) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Extension ${ext.split('').join(' ')} is not available right now.
    Please hold while we transfer you to the next available agent.
  </Say>
  <Redirect method="POST">${APP_URL}/api/phone/menu?callSid=${callSid}</Redirect>
</Response>`
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  const agentName = agent.display_name || agent.profile?.name || 'your party'

  await supabase.from('call_logs')
    .update({ status: 'ringing' })
    .eq('twilio_call_sid', callSid)

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Connecting you to ${agentName}. Please hold.</Say>
  <Dial
    action="${APP_URL}/api/phone/call-complete?deptId=extension&amp;callSid=${callSid}"
    method="POST"
    timeout="30"
    record="record-from-answer"
    recordingStatusCallback="${APP_URL}/api/phone/recording"
    ringTone="us"
  >
    <Number url="${APP_URL}/api/phone/agent-connect?agentId=${agent.id}&amp;callSid=${callSid}">${agent.cell_number}</Number>
    ${agent.profile_id ? `<Client><Identity>${agent.profile_id}</Identity></Client>` : ''}
  </Dial>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
