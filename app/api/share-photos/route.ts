import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No org found' }, { status: 403 })
  }

  const { projectId, photoUrls } = await req.json()

  if (!projectId || !Array.isArray(photoUrls) || photoUrls.length === 0) {
    return NextResponse.json({ error: 'Missing projectId or photoUrls' }, { status: 400 })
  }

  const { data: pack, error } = await supabase
    .from('share_photo_packs')
    .insert({
      project_id: projectId,
      org_id: profile.org_id,
      photo_urls: photoUrls,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(pack)
}
