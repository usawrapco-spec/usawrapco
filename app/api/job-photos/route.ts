import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('project_id')
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: photos } = await admin
    .from('job_photos')
    .select('*')
    .eq('project_id', projectId)
    .order('photo_type')
    .order('sort_order')

  return NextResponse.json({ photos: photos || [] })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { project_id, photo_type, url, caption, zone, is_featured, is_portfolio } = body

    if (!project_id || !photo_type || !url) {
      return NextResponse.json({ error: 'project_id, photo_type, url required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()

    const { data: photo, error } = await admin
      .from('job_photos')
      .insert({
        org_id: profile?.org_id || ORG_ID,
        project_id, photo_type, url, caption, zone,
        is_featured: is_featured ?? false,
        is_portfolio: is_portfolio ?? false,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ photo })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    await admin.from('job_photos').delete().eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...updates } = body

    const admin = getSupabaseAdmin()
    const { data: photo, error } = await admin
      .from('job_photos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ photo })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
