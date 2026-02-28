import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

async function getOwnerProfile(userId: string) {
  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, org_id')
    .eq('id', userId)
    .single()
  return profile
}

// GET — list all training instructions
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getOwnerProfile(user.id)
    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orgId = profile.org_id || ORG_ID
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('ai_settings')
      .select('id, value, created_at')
      .eq('org_id', orgId)
      .eq('key', 'vinyl_instruction')
      .order('created_at', { ascending: true })

    return NextResponse.json({ instructions: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — add a new training instruction
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getOwnerProfile(user.id)
    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { instruction } = await req.json()
    if (!instruction?.trim()) {
      return NextResponse.json({ error: 'Instruction text is required' }, { status: 400 })
    }

    const orgId = profile.org_id || ORG_ID
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('ai_settings')
      .insert({ org_id: orgId, setting_key: 'vinyl_instruction', setting_value: instruction.trim() })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ instruction: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
