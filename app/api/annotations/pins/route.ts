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
    .from('design_pin_comments')
    .select('*, replies:design_pin_replies(*)')
    .eq('design_project_id', designProjectId)
    .order('pin_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pins: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { design_project_id, layer, x_pct, y_pct, content } = body
  if (!design_project_id || !layer || x_pct == null || y_pct == null || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const profile = await admin.from('profiles').select('name, avatar_url').eq('id', user.id).single()

  // Get next pin number for this project
  const { data: existingPins } = await admin
    .from('design_pin_comments')
    .select('pin_number')
    .eq('design_project_id', design_project_id)
    .order('pin_number', { ascending: false })
    .limit(1)

  const nextNum = existingPins && existingPins.length > 0 ? existingPins[0].pin_number + 1 : 1

  const { data, error } = await admin
    .from('design_pin_comments')
    .insert({
      design_project_id,
      layer,
      x_pct,
      y_pct,
      content,
      author_id: user.id,
      author_name: profile.data?.name || 'Team',
      author_avatar: profile.data?.avatar_url || null,
      pin_number: nextNum,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify team members via activity log
  try {
    await admin.from('activity_log').insert({
      action: 'design_pin_added',
      entity_type: 'design_project',
      entity_id: design_project_id,
      actor_id: user.id,
      details: { layer, pin_number: nextNum, content_preview: content.slice(0, 80) },
    })
  } catch {}

  return NextResponse.json({ pin: data })
}
