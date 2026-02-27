import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const designProjectId = req.nextUrl.searchParams.get('design_project_id')
  if (!designProjectId) return NextResponse.json({ error: 'design_project_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('design_video_walkthroughs')
    .select('*, created_by_profile:created_by(name)')
    .eq('design_project_id', designProjectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ walkthroughs: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const video = formData.get('video') as File | null
  const design_project_id = formData.get('design_project_id') as string
  const title = (formData.get('title') as string) || 'Design Walkthrough'
  const duration = parseInt((formData.get('duration') as string) || '0', 10)

  if (!video || !design_project_id) {
    return NextResponse.json({ error: 'Missing video or design_project_id' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Upload video to Supabase storage
  const path = `video-walkthroughs/${design_project_id}/${Date.now()}_walkthrough.webm`
  const arrayBuffer = await video.arrayBuffer()
  const { data: uploadData, error: uploadError } = await admin.storage
    .from('project-files')
    .upload(path, arrayBuffer, { contentType: 'video/webm', upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('project-files').getPublicUrl(path)

  const { data, error } = await admin
    .from('design_video_walkthroughs')
    .insert({
      design_project_id,
      title,
      video_url: publicUrl,
      duration_seconds: duration || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log to activity
  try {
    await admin.from('activity_log').insert({
      action: 'design_video_added',
      entity_type: 'design_project',
      entity_id: design_project_id,
      actor_id: user.id,
      details: { title, duration },
    })
  } catch {}

  return NextResponse.json({ walkthrough: data })
}
