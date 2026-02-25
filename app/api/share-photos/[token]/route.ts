import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const admin = getSupabaseAdmin()

  const { data: pack, error } = await admin
    .from('share_photo_packs')
    .select('*, project:projects(title, vehicle_desc)')
    .eq('token', params.token)
    .single()

  if (error || !pack) {
    return NextResponse.json({ error: 'Share pack not found' }, { status: 404 })
  }

  // Check expiry
  if (pack.expires_at && new Date(pack.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This share link has expired' }, { status: 410 })
  }

  // Increment view count
  await admin
    .from('share_photo_packs')
    .update({ view_count: (pack.view_count || 0) + 1 })
    .eq('id', pack.id)

  return NextResponse.json(pack)
}
