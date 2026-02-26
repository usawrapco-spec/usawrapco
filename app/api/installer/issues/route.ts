import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('project_id')
  const admin = getSupabaseAdmin()

  let query = admin.from('installer_issues').select('*').order('created_at', { ascending: false })
  if (projectId) query = query.eq('project_id', projectId)
  else query = query.eq('installer_id', user.id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.project_id || !body.issue_type || !body.description) {
    return NextResponse.json({ error: 'project_id, issue_type, and description required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data, error } = await admin.from('installer_issues').insert({
    org_id: ORG_ID,
    project_id: body.project_id,
    installer_id: user.id,
    issue_type: body.issue_type,
    urgency: body.urgency || 'medium',
    description: body.description,
    photos: body.photos || [],
    status: 'open',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Critical issues: auto-pause job + notify all managers
  if (body.urgency === 'critical') {
    const { data: managers } = await admin
      .from('profiles')
      .select('id')
      .eq('org_id', ORG_ID)
      .in('role', ['owner', 'admin', 'production'])

    if (managers?.length) {
      const notifications = managers.map((m: { id: string }) => ({
        org_id: ORG_ID,
        user_id: m.id,
        title: 'CRITICAL Install Issue',
        body: `${body.issue_type.replace(/_/g, ' ')}: ${body.description.substring(0, 120)}`,
        type: 'install_issue',
        data: { project_id: body.project_id, issue_id: data.id, urgency: 'critical' },
        read: false,
      }))
      await admin.from('notifications').insert(notifications)
    }

    // Log activity
    await admin.from('activity_log').insert({
      org_id: ORG_ID,
      project_id: body.project_id,
      user_id: user.id,
      action: 'critical_issue_flagged',
      description: `Critical issue: ${body.description.substring(0, 120)}`,
      created_at: new Date().toISOString(),
    }).then(() => {}, () => {})
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('installer_issues')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
