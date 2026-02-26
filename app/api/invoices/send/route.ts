import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { invoice_id, message } = body
  if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, name').eq('id', user.id).single()
  const orgId = profile?.org_id

  // Load invoice + line items
  const { data: inv } = await admin
    .from('invoices')
    .select('*, customer:customer_id(id, name, email)')
    .eq('id', invoice_id)
    .single()

  if (!inv) return Response.json({ error: 'Invoice not found' }, { status: 404 })

  const { data: lineItems } = await admin
    .from('line_items')
    .select('*')
    .eq('parent_type', 'invoice')
    .eq('parent_id', invoice_id)
    .order('sort_order', { ascending: true })

  const customerEmail = (inv.customer as any)?.email
  const customerName  = (inv.customer as any)?.name || 'Customer'

  // Format invoice summary for email body
  const items = (lineItems || []).map((li: any) =>
    `• ${li.name}: $${Number(li.total_price).toFixed(2)}`
  ).join('\n')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
  const viewUrl = `${appUrl}/invoice/view/${inv.id}`

  const emailBody = message?.trim() ||
    `Hi ${customerName},\n\nPlease find your invoice INV-${inv.invoice_number} from USA WRAP CO below.\n\nTotal Due: $${Number(inv.total).toFixed(2)}\nDue Date: ${inv.due_date || 'Upon receipt'}\n\n${items}\n\nView & pay online: ${viewUrl}\n\nThank you for your business!\n— USA WRAP CO`

  let emailSent = false

  // Try SendGrid if configured
  try {
    const { data: sgIntegration } = await admin
      .from('integrations')
      .select('config, enabled')
      .eq('org_id', orgId)
      .eq('integration_id', 'sendgrid')
      .eq('enabled', true)
      .single()

    const sgConfig = sgIntegration?.config as any
    if (sgConfig?.api_key && customerEmail) {
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sgConfig.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: customerEmail, name: customerName }] }],
          from: { email: sgConfig.from_email || 'noreply@usawrapco.com', name: 'USA WRAP CO' },
          subject: `Invoice INV-${inv.invoice_number} from USA WRAP CO — $${Number(inv.total).toFixed(2)} Due`,
          content: [{ type: 'text/plain', value: emailBody }],
        }),
      })
      if (sgRes.ok || sgRes.status === 202) emailSent = true
    }
  } catch {}

  // Log to communication_log
  try {
    await admin.from('communication_log').insert({
      org_id: orgId,
      customer_id: inv.customer_id,
      project_id: inv.project_id || null,
      type: 'email',
      direction: 'outbound',
      subject: `Invoice INV-${inv.invoice_number}`,
      body: emailBody,
      sent_by: user.id,
      status: emailSent ? 'sent' : 'logged',
    })
  } catch {}

  // Mark invoice as sent
  await admin.from('invoices').update({ status: 'sent' }).eq('id', invoice_id)

  // Create internal notification
  try {
    await admin.from('notifications').insert({
      org_id: orgId,
      user_id: user.id,
      title: `Invoice INV-${inv.invoice_number} sent`,
      message: `Sent to ${customerName}${customerEmail ? ` (${customerEmail})` : ''}${emailSent ? ' via email' : ' — email not configured'}`,
      type: 'invoice',
      read: false,
    })
  } catch {}

  return Response.json({
    success: true,
    emailSent,
    customerEmail,
    message: emailSent
      ? `Invoice emailed to ${customerEmail}`
      : 'Invoice marked as sent. Configure SendGrid to enable email delivery.',
  })
}
