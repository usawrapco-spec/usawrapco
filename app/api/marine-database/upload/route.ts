import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const BUCKET = 'project-files'
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['owner', 'admin'].includes(profile.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const vesselId = formData.get('vessel_id') as string | null

  if (!file || !vesselId) return NextResponse.json({ error: 'Missing file or vessel_id' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })

  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `marine-docs/${vesselId}/${Date.now()}_${safeName}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl

  // Add to vessel's custom_documents array
  const { data: vessel } = await admin
    .from('marine_vessels')
    .select('custom_documents')
    .eq('id', vesselId)
    .single()

  const docs = Array.isArray(vessel?.custom_documents) ? vessel.custom_documents : []
  const newDoc = {
    name: file.name,
    url: publicUrl,
    storage_path: storagePath,
    uploaded_at: new Date().toISOString(),
    uploaded_by: user.id,
  }
  docs.push(newDoc)

  const { error: updateErr } = await admin
    .from('marine_vessels')
    .update({ custom_documents: docs })
    .eq('id', vesselId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ document: newDoc, documents: docs })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['owner', 'admin'].includes(profile.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { vessel_id, storage_path } = await req.json()
  if (!vessel_id || !storage_path) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Remove from storage
  await admin.storage.from(BUCKET).remove([storage_path])

  // Remove from vessel's custom_documents array
  const { data: vessel } = await admin
    .from('marine_vessels')
    .select('custom_documents')
    .eq('id', vessel_id)
    .single()

  const docs = Array.isArray(vessel?.custom_documents) ? vessel.custom_documents : []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = docs.filter((d: any) => d.storage_path !== storage_path)

  const { error } = await admin
    .from('marine_vessels')
    .update({ custom_documents: updated })
    .eq('id', vessel_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: updated })
}
