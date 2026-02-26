import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { designProjectId, name, canvasData, thumbnailUrl } = await req.json()
  if (!designProjectId || !canvasData) {
    return NextResponse.json({ error: 'designProjectId and canvasData required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('design_canvas_versions')
    .insert({
      design_project_id: designProjectId,
      name: name || `Version ${new Date().toLocaleString()}`,
      canvas_data: canvasData,
      thumbnail_url: thumbnailUrl || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ version: data })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const designProjectId = req.nextUrl.searchParams.get('designProjectId')
  if (!designProjectId) return NextResponse.json({ error: 'designProjectId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('design_canvas_versions')
    .select('id, name, thumbnail_url, created_at, created_by')
    .eq('design_project_id', designProjectId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ versions: data || [] })
}
