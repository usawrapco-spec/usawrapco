import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; proofId: string } }
) {
  const admin = getSupabaseAdmin()
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if ('status' in body) updates.status = body.status
  if ('title' in body) updates.title = body.title
  if ('internal_notes' in body) updates.internal_notes = body.internal_notes
  if ('customer_notes' in body) updates.customer_notes = body.customer_notes
  if ('approved_by' in body) updates.approved_by = body.approved_by
  if ('current_version' in body) updates.current_version = body.current_version
  if (body.status === 'approved') updates.approved_at = new Date().toISOString()
  if (body.status === 'sent') updates.sent_at = new Date().toISOString()
  updates.updated_at = new Date().toISOString()

  const { data, error } = await admin
    .from('job_proofs')
    .update(updates)
    .eq('id', params.proofId)
    .eq('project_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proof: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; proofId: string } }
) {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('job_proofs')
    .delete()
    .eq('id', params.proofId)
    .eq('project_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
