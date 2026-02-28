import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { awardXP } from '@/lib/xp'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { project_id, image_url, title, note_to_customer } = await req.json()

  if (!project_id || !image_url) {
    return NextResponse.json({ error: 'project_id and image_url required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Get org_id from user profile
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
  }

  // Get latest version number for this project
  const { data: latest } = await admin
    .from('design_proofs')
    .select('version_number')
    .eq('project_id', project_id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (latest?.version_number || 0) + 1

  // Insert proof record
  const { data: proof, error } = await admin
    .from('design_proofs')
    .insert({
      org_id: profile.org_id,
      project_id,
      version_number: nextVersion,
      image_url,
      title: title || 'Your Design Proof',
      note_to_customer: note_to_customer || null,
      status: 'pending',
      sent_by: user.id,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[PROOF] Create error:', error)
    return NextResponse.json({ error: 'Failed to create proof' }, { status: 500 })
  }

  // Award XP for uploading a design proof
  awardXP(user.id, profile.org_id, 'design_proof_uploaded', 25, { project_id }).catch(() => {})

  return NextResponse.json({ proof })
}
