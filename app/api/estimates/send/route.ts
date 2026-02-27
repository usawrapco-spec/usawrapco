import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { sendTransactionalEmail } from '@/lib/email/send'
import { generateEstimateEmail } from '@/lib/email/templates'
import { awardXP } from '@/lib/xp'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { estimate_id, to, subject, message, sendVia } = body
  if (!estimate_id) return Response.json({ error: 'estimate_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id, name, email')
    .eq('id', user.id)
    .single()

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
  const recipientName = (est.customer as any)?.name || 'Customer'

  const items = (lineItems || [])
    .map((li: any) => `• ${li.name}: $${Number(li.total_price).toFixed(2)}`)
    .join('\n')

  let emailSent = false
  let conversationId: string | null = null

  if (recipientEmail && (sendVia === 'email' || sendVia === 'both' || !sendVia)) {
    // Use custom message or auto-generate
    const emailHtml = message?.trim()
      ? `<div style="font-size:15px;line-height:1.7;color:#e8eaed;">${message.replace(/\n/g, '<br/>')}</div>`
      : generateEstimateEmail({
          title: est.title,
          vehicle_desc: est.vehicle_desc,
          estimate_number: est.estimate_number,
          total: est.total,
          id: est.id,
        })

    const result = await sendTransactionalEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: subject || `Your Estimate #${est.estimate_number} from USA Wrap Co`,
      html: emailHtml,
      projectId: est.project_id || undefined,
      customerId: est.customer_id || undefined,
      sentBy: user.id,
      emailType: 'estimate',
    })

    emailSent = result.success
    conversationId = result.conversationId
  }

  // Log communication
  try {
    await admin.from('communication_log').insert({
      org_id: profile?.org_id,
      customer_id: est.customer_id,
      type: 'email',
      direction: 'outbound',
      subject: subject || `Estimate #${est.estimate_number}`,
      body: message || `Estimate sent to ${recipientEmail}`,
      sent_by: user.id,
      status: emailSent ? 'sent' : 'logged',
    })
  } catch {}

  // Mark estimate as sent
  await admin.from('estimates').update({ status: 'sent' }).eq('id', estimate_id)

  // Award XP for sending estimate
  if (profile?.org_id) {
    awardXP(user.id, profile.org_id, 'estimate_sent', 15, { estimate_id }).catch(() => {})
  }

  return Response.json({
    success: true,
    emailSent,
    recipientEmail,
    conversationId,
    message: emailSent
      ? `Estimate emailed to ${recipientEmail}`
      : 'Estimate marked as sent. Add RESEND_API_KEY to Supabase secrets to enable email delivery.',
  })
}
