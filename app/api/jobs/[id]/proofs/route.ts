import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('job_proofs')
    .select(`
      *,
      versions:job_proof_versions(id, version_number, file_url, file_name, thumbnail_url, notes, created_at,
        uploader:uploaded_by(name)),
      messages:job_proof_messages(id, content, sender_name, sender_type, created_at)
    `)
    .eq('project_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proofs: data || [] })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getSupabaseAdmin()
  const body = await req.json()

  // Get current proof count to auto-number
  const { count } = await admin
    .from('job_proofs')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', params.id)

  const proofNumber = (count ?? 0) + 1

  const { data, error } = await admin
    .from('job_proofs')
    .insert({
      org_id: body.org_id || ORG_ID,
      project_id: params.id,
      proof_number: proofNumber,
      title: body.title || `Design Proof #${proofNumber}`,
      status: 'draft',
      current_version: 1,
      internal_notes: body.internal_notes || null,
      created_by: body.created_by || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proof: data })
}
