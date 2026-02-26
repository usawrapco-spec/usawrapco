import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversation_id')
  if (!conversationId) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('conversation_ai_config')
    .select('*')
    .eq('conversation_id', conversationId)
    .single()

  return NextResponse.json({ config: data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { conversation_id, ...fields } = body
  if (!conversation_id) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('conversation_ai_config')
    .upsert({ conversation_id, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'conversation_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { conversation_id, ...fields } = body
  if (!conversation_id) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })

  // Handle pause — set paused_by to current user
  if (fields.pause === true) {
    fields.paused_by = user.id
    fields.paused_at = new Date().toISOString()
    fields.ai_enabled = false
    delete fields.pause
  } else if (fields.pause === false) {
    fields.paused_by = null
    fields.paused_at = null
    fields.ai_enabled = true
    delete fields.pause
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('conversation_ai_config')
    .upsert({ conversation_id, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'conversation_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
