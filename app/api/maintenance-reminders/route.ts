import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const days = parseInt(req.nextUrl.searchParams.get('days') || '60')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)

  const { data: reminders } = await admin
    .from('maintenance_reminders')
    .select('*, projects(title, pipe_stage)')
    .eq('org_id', 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f')
    .in('status', ['pending', 'snoozed'])
    .lte('due_date', cutoff.toISOString().split('T')[0])
    .order('due_date')

  return NextResponse.json({ reminders: reminders || [] })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const admin = getSupabaseAdmin()

    const { data: reminder, error } = await admin
      .from('maintenance_reminders')
      .insert({ org_id: 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f', ...body })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reminder })
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

    const { data: reminder, error } = await admin
      .from('maintenance_reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reminder })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
