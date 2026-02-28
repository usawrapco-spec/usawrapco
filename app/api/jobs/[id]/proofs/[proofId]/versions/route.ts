import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; proofId: string } }
) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('job_proof_versions')
    .select('*, uploader:uploaded_by(name)')
    .eq('proof_id', params.proofId)
    .order('version_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ versions: data || [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; proofId: string } }
) {
  const admin = getSupabaseAdmin()
  const body = await req.json()

  // Get next version number
  const { count } = await admin
    .from('job_proof_versions')
    .select('id', { count: 'exact', head: true })
    .eq('proof_id', params.proofId)

  const versionNumber = (count ?? 0) + 1

  const { data, error } = await admin
    .from('job_proof_versions')
    .insert({
      proof_id: params.proofId,
      org_id: body.org_id || ORG_ID,
      version_number: versionNumber,
      file_url: body.file_url || null,
      file_name: body.file_name || null,
      file_type: body.file_type || null,
      thumbnail_url: body.thumbnail_url || null,
      notes: body.notes || null,
      uploaded_by: body.uploaded_by || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update proof's current_version
  await admin
    .from('job_proofs')
    .update({ current_version: versionNumber, updated_at: new Date().toISOString() })
    .eq('id', params.proofId)

  return NextResponse.json({ version: data })
}
