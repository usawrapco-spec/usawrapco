import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

async function getOrgId() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  return profile?.org_id || ORG_ID
}

export async function GET() {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('wrap_knowledge_base')
    .select('id, category, title, content, active, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  return NextResponse.json({ entries: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { category, title, content } = await req.json()
  if (!category || !title) return NextResponse.json({ error: 'category and title required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('wrap_knowledge_base')
    .insert({ org_id: orgId, category, title, content: content || '', created_by: user.id })
    .select('id, category, title, content, active, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function PUT(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, title, content, active } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('wrap_knowledge_base')
    .update({ title, content, active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  await admin.from('wrap_knowledge_base').delete().eq('id', id).eq('org_id', orgId)
  return NextResponse.json({ ok: true })
}
