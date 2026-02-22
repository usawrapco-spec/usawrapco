import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { to, subject, body: emailBody, customer_id, project_id } = body

  if (!to || !emailBody) return Response.json({ error: 'to and body required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, name').eq('id', user.id).single()
  const orgId = profile?.org_id

  let emailSent = false

  // Try SendGrid
  try {
    const { data: sgInt } = await admin
      .from('integrations')
      .select('config, enabled')
      .eq('org_id', orgId)
      .eq('integration_id', 'sendgrid')
      .eq('enabled', true)
      .single()

    const cfg = sgInt?.config as any
    if (cfg?.api_key) {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: cfg.from_email || 'noreply@usawrapco.com', name: 'USA WRAP CO' },
          subject: subject || 'Message from USA WRAP CO',
          content: [{ type: 'text/plain', value: emailBody }],
          reply_to: { email: cfg.reply_to || cfg.from_email || 'noreply@usawrapco.com', name: profile?.name || 'USA WRAP CO' },
        }),
      })
      if (res.ok || res.status === 202) emailSent = true
    }
  } catch {}

  // Log communication
  try {
    await admin.from('communication_log').insert({
      org_id: orgId,
      customer_id: customer_id || null,
      project_id: project_id || null,
      type: 'email',
      direction: 'outbound',
      subject: subject || 'Message from USA WRAP CO',
      body: emailBody,
      sent_by: user.id,
      status: emailSent ? 'sent' : 'logged',
    })
  } catch {}

  return Response.json({
    success: emailSent,
    emailSent,
    message: emailSent ? `Email sent to ${to}` : `Message logged (SendGrid not configured)`,
  })
}
