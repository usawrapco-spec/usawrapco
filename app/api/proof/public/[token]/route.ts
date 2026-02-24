import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const admin = getSupabaseAdmin()

  // Find proof by public_token
  const { data: proof, error } = await admin
    .from('design_proofs')
    .select('*, project:projects(title, vehicle_desc)')
    .eq('public_token', params.token)
    .single()

  if (error || !proof) {
    return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
  }

  // Check expiry
  if (proof.expires_at && new Date(proof.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This proof link has expired' }, { status: 410 })
  }

  // Mark as viewed on first access
  if (!proof.viewed_at) {
    await admin
      .from('design_proofs')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', proof.id)
  }

  // Fetch existing annotations
  const { data: annotations } = await admin
    .from('proof_annotations')
    .select('*')
    .eq('proof_id', proof.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ proof, annotations: annotations || [] })
}
