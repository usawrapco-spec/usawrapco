import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { estimate_id, to, subject, message, sendVia } = body
  if (!estimate_id) return Response.json({ error: 'estimate_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, name, email').eq('id', user.id).single()
  const orgId = profile?.org_id

  // Load estimate
  const { data: est } = await admin
    .from('estimates')
    .select('*, customer:customer_id(id, name, email)')
    .eq('id', estimate_id)
    .single()

  if (!est) return Response.json({ error: 'Estimate not found' }, { status: 404 })

  const { data: lineItems } = await admin
    .from('line_items')
    .select('*')
    .eq('parent_type', 'estimate')
    .eq('parent_id', estimate_id)
    .order('sort_order', { ascending: true })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
  const viewUrl = `${appUrl}/estimate/view/${est.id}`

  const recipientEmail = to || (est.customer as any)?.email
  const recipientName  = (est.customer as any)?.name || 'Customer'

  const items = (lineItems || []).map((li: any) =>
    `• ${li.name}: $${Number(li.total_price).toFixed(2)}`
  ).join('\n')

  const emailBody = message?.trim() ||
    `Hi ${recipientName},\n\nThank you for your interest in USA WRAP CO. Please find your estimate below.\n\nEstimate #${est.estimate_number}\nTotal: $${Number(est.total).toFixed(2)}\nValid for 30 days\n\n${items}\n\nView your estimate online: ${viewUrl}\n\nReady to move forward? Reply to this email or call us directly.\n\n— ${profile?.name || 'USA WRAP CO'}\nUSA WRAP CO`

  let emailSent = false

  // SendGrid email
  if (recipientEmail && (sendVia === 'email' || sendVia === 'both' || !sendVia)) {
    try {
      const { data: sgInt } = await admin
        .from('integrations')
        .select('config, enabled')
        .eq('org_id', orgId)
        .eq('integration_id', 'sendgrid')
        .eq('enabled', true)
        .single()

      const sgCfg = sgInt?.config as any
      if (sgCfg?.api_key) {
        const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sgCfg.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: recipientEmail, name: recipientName }] }],
            from: { email: sgCfg.from_email || 'noreply@usawrapco.com', name: 'USA WRAP CO' },
            subject: subject || `Your Estimate #${est.estimate_number} from USA WRAP CO`,
            content: [{ type: 'text/plain', value: emailBody }],
          }),
        })
        if (sgRes.ok || sgRes.status === 202) emailSent = true
      }
    } catch {}
  }

  // Log communication
  try {
    await admin.from('communication_log').insert({
      org_id: orgId,
      customer_id: est.customer_id,
      type: 'email',
      direction: 'outbound',
      subject: subject || `Estimate #${est.estimate_number}`,
      body: emailBody,
      sent_by: user.id,
      status: emailSent ? 'sent' : 'logged',
    })
  } catch {}

  // Mark estimate as sent
  await admin.from('estimates').update({ status: 'sent' }).eq('id', estimate_id)

  return Response.json({
    success: true,
    emailSent,
    recipientEmail,
    message: emailSent
      ? `Estimate emailed to ${recipientEmail}`
      : 'Estimate marked as sent. Configure SendGrid to enable email delivery.',
  })
}
