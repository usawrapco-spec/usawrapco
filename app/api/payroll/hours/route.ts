import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')
  const userId = req.nextUrl.searchParams.get('user_id')

  if (!from || !to)
    return NextResponse.json({ error: 'from and to query params required' }, { status: 400 })

  // Build time_blocks query
  let blocksQuery = admin
    .from('time_blocks')
    .select('id, user_id, project_id, title, block_type, start_at, end_at, notes')
    .eq('org_id', orgId)
    .gte('start_at', `${from}T00:00:00`)
    .lte('start_at', `${to}T23:59:59`)
    .order('start_at')

  if (userId) blocksQuery = blocksQuery.eq('user_id', userId)

  const [blocksRes, employeesRes, projectsRes] = await Promise.all([
    blocksQuery,
    admin.from('profiles')
      .select('id, name, role')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('name'),
    admin.from('projects')
      .select('id, title, vehicle_desc')
      .eq('org_id', orgId)
      .limit(500),
  ])

  const blocks = blocksRes.data || []
  const employees = employeesRes.data || []
  const projects = projectsRes.data || []
  const projectMap = new Map(projects.map(p => [p.id, p]))

  // Group by employee
  const byEmployee: Record<string, {
    user_id: string
    name: string
    role: string
    total_hours: number
    days_worked: number
    blocks: any[]
    gaps: string[]
  }> = {}

  for (const emp of employees) {
    byEmployee[emp.id] = {
      user_id: emp.id,
      name: emp.name,
      role: emp.role,
      total_hours: 0,
      days_worked: 0,
      blocks: [],
      gaps: [],
    }
  }

  const daysSeen: Record<string, Set<string>> = {}

  for (const block of blocks) {
    const uid = block.user_id
    if (!byEmployee[uid]) continue

    const start = new Date(block.start_at)
    const end = new Date(block.end_at)
    const hours = Math.max(0, (end.getTime() - start.getTime()) / 3600000)
    const dateKey = start.toISOString().split('T')[0]
    const project = block.project_id ? projectMap.get(block.project_id) : null

    byEmployee[uid].total_hours += hours
    byEmployee[uid].blocks.push({
      ...block,
      hours: Math.round(hours * 100) / 100,
      date: dateKey,
      project_title: project?.title || null,
      vehicle_desc: project?.vehicle_desc || null,
    })

    if (!daysSeen[uid]) daysSeen[uid] = new Set()
    daysSeen[uid].add(dateKey)
  }

  // Calculate days worked and detect gaps
  const startDate = new Date(from)
  const endDate = new Date(to)

  for (const uid of Object.keys(byEmployee)) {
    byEmployee[uid].days_worked = daysSeen[uid]?.size || 0
    byEmployee[uid].total_hours = Math.round(byEmployee[uid].total_hours * 100) / 100

    // Flag gaps: weekdays with no time entries
    const current = new Date(startDate)
    while (current <= endDate) {
      const day = current.getDay()
      if (day !== 0 && day !== 6) {
        const dateStr = current.toISOString().split('T')[0]
        if (!daysSeen[uid]?.has(dateStr)) {
          byEmployee[uid].gaps.push(dateStr)
        }
      }
      current.setDate(current.getDate() + 1)
    }
  }

  return NextResponse.json({
    period: { from, to },
    employees: Object.values(byEmployee).filter(e => e.blocks.length > 0 || e.role !== 'viewer'),
  })
}

// POST — manual hour adjustment
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { user_id, date, hours, reason } = body

  if (!user_id || !date || hours === undefined || !reason)
    return NextResponse.json({ error: 'user_id, date, hours, and reason required' }, { status: 400 })

  const orgId = profile.org_id || ORG_ID

  // Create an adjustment time block
  const startAt = `${date}T08:00:00`
  const endMs = new Date(startAt).getTime() + hours * 3600000
  const endAt = new Date(endMs).toISOString()

  const { data, error } = await admin.from('time_blocks').insert({
    org_id: orgId,
    user_id,
    title: `Manual adjustment: ${reason}`,
    block_type: 'other',
    start_at: startAt,
    end_at: endAt,
    notes: `Manager override by ${profile.role}. Reason: ${reason}`,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ block: data }, { status: 201 })
}
