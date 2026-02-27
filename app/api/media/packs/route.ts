import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// POST /api/media/packs — create a photo pack
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const body = await req.json() as {
    name: string
    description?: string | null
    media_file_ids: string[]
    photo_urls: string[]
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('media_packs')
    .insert({
      org_id: profile.org_id,
      name: body.name.trim(),
      description: body.description ?? null,
      media_file_ids: body.media_file_ids ?? [],
      photo_urls: body.photo_urls ?? [],
      created_by: user.id,
    })
    .select('id, name, created_at')
    .single()

  if (error) {
    console.error('[media/packs] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// GET /api/media/packs — list packs for the org
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const { data, error } = await admin
    .from('media_packs')
    .select('id, name, description, media_file_ids, photo_urls, created_at, view_count')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
