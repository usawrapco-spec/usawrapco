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
    .from('design_markups')
    .select('*')
    .eq('design_project_id', designProjectId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ markups: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { design_project_id, layer, markup_type, data: markupData, color, stroke_width } = body
  if (!design_project_id || !layer || !markup_type || !markupData) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('design_markups')
    .insert({
      design_project_id,
      layer,
      markup_type,
      data: markupData,
      color: color || '#4f7fff',
      stroke_width: stroke_width || 2,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ markup: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, design_project_id, layer } = await req.json()
  const admin = getSupabaseAdmin()

  // Delete single markup by id, or all markups for a layer
  if (id) {
    const { error } = await admin.from('design_markups').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (design_project_id && layer) {
    const { error } = await admin
      .from('design_markups')
      .delete()
      .eq('design_project_id', design_project_id)
      .eq('layer', layer)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Provide id or design_project_id+layer' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
