import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const admin = getSupabaseAdmin()

  // Find proof
  const { data: proof, error: proofErr } = await admin
    .from('design_proofs')
    .select('id, project_id, org_id, status')
    .eq('public_token', params.token)
    .single()

  if (proofErr || !proof) {
    return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
  }

  if (proof.status === 'approved' || proof.status === 'changes_requested') {
    return NextResponse.json({ error: 'This proof has already been submitted' }, { status: 400 })
  }

  const { decision, annotations, overall_note } = await req.json()

  if (!decision || !['approved', 'changes_requested'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
  }

  // Batch insert annotations
  if (annotations && annotations.length > 0) {
    const rows = annotations.map((a: { type: string; color: string; data: object; page?: number }) => ({
      proof_id: proof.id,
      type: a.type,
      color: a.color,
      data: a.data,
      page: a.page || 1,
    }))

    const { error: annErr } = await admin.from('proof_annotations').insert(rows)
    if (annErr) {
      console.error('[PROOF] Annotation insert error:', annErr)
    }
  }

  // Update proof status
  const now = new Date().toISOString()
  await admin
    .from('design_proofs')
    .update({
      status: decision,
      customer_status: decision,
      decided_at: now,
      customer_decision: decision,
      customer_overall_note: overall_note || null,
      customer_approved_at: decision === 'approved' ? now : null,
    })
    .eq('id', proof.id)

  // If approved, update project form_data approval status
  if (decision === 'approved') {
    const { data: project } = await admin
      .from('projects')
      .select('form_data')
      .eq('id', proof.project_id)
      .single()

    if (project) {
      const fd = (project.form_data || {}) as Record<string, unknown>
      fd.approvalStatus = 'approved'
      await admin
        .from('projects')
        .update({ form_data: fd })
        .eq('id', proof.project_id)
    }
  }

  return NextResponse.json({ success: true, decision })
}
