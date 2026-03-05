/**
 * POST /api/mockup/public-upload
 * Public (no auth) endpoint for customer photo uploads.
 * Accepts a single image file, uploads to mockup-results storage, returns public URL.
 */
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { randomUUID } from 'crypto'

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB
const ORG_ID   = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file field required' }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'heic']
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WEBP, HEIC allowed' }, { status: 400 })
  }

  const id   = randomUUID()
  const path = `customer-uploads/${id}/photo.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const admin  = getSupabaseAdmin()

  const { error: upErr } = await admin.storage
    .from('mockup-results')
    .upload(path, buffer, { contentType: file.type || 'image/jpeg', upsert: false })

  if (upErr) {
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 })
  }

  const { data } = admin.storage.from('mockup-results').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, upload_id: id })
}
