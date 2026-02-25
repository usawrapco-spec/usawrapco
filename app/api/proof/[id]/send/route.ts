import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { sendTransactionalEmail } from '@/lib/email/send'
import { generateProofEmail } from '@/lib/email/templates'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customer_email, customer_name } = await req.json()
  if (!customer_email) {
    return NextResponse.json({ error: 'customer_email required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: proof, error } = await admin
    .from('design_proofs')
    .select('*, project:projects(id, title, vehicle_desc, customer_id)')
    .eq('id', params.id)
    .single()

  if (error || !proof) {
    return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
  }

  // Update sent_at
  await admin
    .from('design_proofs')
    .update({ sent_at: new Date().toISOString(), sent_by: user.id, status: 'sent' })
    .eq('id', proof.id)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
  const proofLink = `${baseUrl}/proof/${proof.public_token}`
  const project = proof.project as any

  const html = generateProofEmail(
    { title: project?.title, vehicle_desc: project?.vehicle_desc },
    proofLink
  )

  const result = await sendTransactionalEmail({
    to: customer_email,
    toName: customer_name || undefined,
    subject: `Design Proof Ready — ${project?.title || 'Your Vehicle Wrap'}`,
    html,
    projectId: project?.id || undefined,
    customerId: project?.customer_id || undefined,
    sentBy: user.id,
    emailType: 'proof',
  })

  return NextResponse.json({
    success: result.success,
    proof_link: proofLink,
    conversationId: result.conversationId,
  })
}
