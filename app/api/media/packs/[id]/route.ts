import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// GET /api/media/packs/[id] — public, returns pack + photo file details
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const admin = getSupabaseAdmin()

  const { data: pack, error } = await admin
    .from('media_packs')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !pack) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }

  // Fetch the actual media_file records for rich metadata
  let files: unknown[] = []
  const ids = Array.isArray(pack.media_file_ids) ? pack.media_file_ids : []
  if (ids.length > 0) {
    const { data: mediaFiles } = await admin
      .from('media_files')
      .select('id, filename, public_url, mime_type, file_size, category, ai_description, tags, ai_tags, color_tags, created_at')
      .in('id', ids)
    files = mediaFiles ?? []
  }

  // Increment view count (fire-and-forget)
  admin
    .from('media_packs')
    .update({ view_count: (pack.view_count ?? 0) + 1 })
    .eq('id', params.id)
    .then(() => {}, () => {})

  return NextResponse.json({ pack, files })
}
