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
    .from('design_instructions')
    .select('*, items:design_instruction_items(*, assigned_to_profile:assigned_to(name), completed_by_profile:completed_by(name), approved_by_profile:approved_by(name)), created_by_profile:created_by(name)')
    .eq('design_project_id', designProjectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ instructions: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { design_project_id, title, items } = await req.json()
  if (!design_project_id || !title) {
    return NextResponse.json({ error: 'design_project_id and title required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: instruction, error } = await admin
    .from('design_instructions')
    .insert({ design_project_id, title, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert checklist items if provided
  if (items && items.length > 0) {
    const itemRows = items.map((text: string, i: number) => ({
      instruction_id: instruction.id,
      text,
      sort_order: i,
    }))
    await admin.from('design_instruction_items').insert(itemRows)
  }

  // Reload with items
  const { data: full } = await admin
    .from('design_instructions')
    .select('*, items:design_instruction_items(*)')
    .eq('id', instruction.id)
    .single()

  // Notify designers via activity log
  try {
    await admin.from('activity_log').insert({
      action: 'design_instructions_created',
      entity_type: 'design_project',
      entity_id: design_project_id,
      actor_id: user.id,
      metadata: { title, item_count: items?.length || 0 },
    })
  } catch {}

  return NextResponse.json({ instruction: full })
}
