import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { to, message, customer_id, project_id } = body

  if (!to || !message) return Response.json({ error: 'to and message required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, name').eq('id', user.id).single()
  const orgId = profile?.org_id

  let smsSent = false
  let errorMsg = ''

  // Try Twilio if configured
  try {
    const { data: twilio } = await admin
      .from('integrations')
      .select('config, enabled')
      .eq('org_id', orgId)
      .eq('integration_id', 'twilio')
      .eq('enabled', true)
      .single()

    const cfg = twilio?.config as any

    if (cfg?.account_sid && cfg?.auth_token && cfg?.from_number) {
      const toNumber = to.replace(/[^\d+]/g, '')
      const fromNumber = cfg.from_number.replace(/[^\d+]/g, '')

      const formData = new URLSearchParams({
        From: fromNumber.startsWith('+') ? fromNumber : `+1${fromNumber}`,
        To: toNumber.startsWith('+') ? toNumber : `+1${toNumber}`,
        Body: message,
      })

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${cfg.account_sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${cfg.account_sid}:${cfg.auth_token}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        }
      )

      const twilioData = await twilioRes.json()
      if (twilioRes.ok && twilioData.sid) {
        smsSent = true
      } else {
        errorMsg = twilioData.message || 'Twilio error'
      }
    } else {
      errorMsg = 'Twilio not configured'
    }
  } catch (err: any) {
    errorMsg = err.message || 'SMS error'
  }

  // Log to communication_log
  try {
    await admin.from('communication_log').insert({
      org_id: orgId,
      customer_id: customer_id || null,
      project_id: project_id || null,
      type: 'sms',
      direction: 'outbound',
      body: message,
      sent_by: user.id,
      status: smsSent ? 'sent' : 'logged',
      metadata: { to_number: to },
    })
  } catch {}

  return Response.json({
    success: smsSent,
    smsSent,
    errorMsg: smsSent ? null : errorMsg,
    message: smsSent
      ? `SMS sent to ${to}`
      : `SMS logged (Twilio: ${errorMsg || 'not configured'})`,
  })
}
