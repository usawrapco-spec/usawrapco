import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['sales_agent', 'admin', 'owner'].includes(profile.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(req.url)
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
    const status = url.searchParams.get('status')

    let query = admin
      .from('agent_daily_tasks')
      .select('*')
      .eq('agent_id', user.id)
      .eq('task_date', date)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (status) query = query.eq('status', status)

    const { data: tasks, error } = await query
    if (error) throw error

    return NextResponse.json({ tasks: tasks || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['sales_agent', 'admin', 'owner'].includes(profile.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { data: task, error } = await admin
      .from('agent_daily_tasks')
      .insert({
        org_id: profile.org_id,
        agent_id: user.id,
        task_date: body.task_date || new Date().toISOString().split('T')[0],
        type: body.type || 'custom',
        title: body.title,
        description: body.description || null,
        related_lead_id: body.related_lead_id || null,
        related_call_id: body.related_call_id || null,
        related_referral_id: body.related_referral_id || null,
        priority: body.priority || 'normal',
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ task })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const body = await req.json()
    const { id, status } = body

    const update: any = { status }
    if (status === 'done') update.completed_at = new Date().toISOString()

    const { error } = await admin
      .from('agent_daily_tasks')
      .update(update)
      .eq('id', id)
      .eq('agent_id', user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
