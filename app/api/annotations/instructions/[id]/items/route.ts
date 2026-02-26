import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, sort_order } = await req.json()
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('design_instruction_items')
    .insert({ instruction_id: params.id, text, sort_order: sort_order || 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { item_id, ...updates } = body

  if (!item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 })

  // Handle complete action
  if (updates.action === 'complete') {
    updates.completed_by = user.id
    updates.completed_at = new Date().toISOString()
    delete updates.action
  } else if (updates.action === 'uncomplete') {
    updates.completed_by = null
    updates.completed_at = null
    delete updates.action
  } else if (updates.action === 'approve') {
    updates.approved_by = user.id
    updates.approved_at = new Date().toISOString()
    delete updates.action
  } else if (updates.action === 'unapprove') {
    updates.approved_by = null
    updates.approved_at = null
    delete updates.action
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('design_instruction_items')
    .update(updates)
    .eq('id', item_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { item_id } = await req.json()
  if (!item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { error } = await admin.from('design_instruction_items').delete().eq('id', item_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
