import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, difficulty_rating, difficulty_notes, quality_checklist } = body
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // 1. Update project to prod_review stage
  const { error: projErr } = await admin.from('projects').update({
    pipe_stage: 'prod_review',
    updated_at: new Date().toISOString(),
    checkout: {
      install_complete: true,
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      difficulty_rating: difficulty_rating || null,
      difficulty_notes: difficulty_notes || null,
      quality_checklist: quality_checklist || {},
    },
  }).eq('id', project_id)

  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })

  // 2. Complete installer assignment
  await admin.from('installer_assignments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('project_id', project_id)
    .eq('installer_id', user.id)
    .catch(() => {})

  // 3. Fetch project for notifications
  const { data: project } = await admin
    .from('projects')
    .select('id, title, agent_id')
    .eq('id', project_id)
    .single()

  // 4. Build notifications
  const notifications: any[] = []

  if (project?.agent_id) {
    notifications.push({
      org_id: ORG_ID,
      user_id: project.agent_id,
      title: 'Install Complete',
      body: `${project.title} install is complete and ready for review.`,
      type: 'install_complete',
      data: { project_id },
      read: false,
    })
  }

  const { data: managers } = await admin
    .from('profiles')
    .select('id')
    .eq('org_id', ORG_ID)
    .in('role', ['owner', 'admin', 'production'])

  if (managers?.length) {
    managers.forEach((m: { id: string }) => {
      if (m.id !== project?.agent_id) {
        notifications.push({
          org_id: ORG_ID,
          user_id: m.id,
          title: 'Install Complete - QC Required',
          body: `${project?.title} is ready for quality review.`,
          type: 'install_complete',
          data: { project_id },
          read: false,
        })
      }
    })
  }

  if (notifications.length) {
    await admin.from('notifications').insert(notifications).catch(() => {})
  }

  // 5. Activity log
  await admin.from('activity_log').insert({
    org_id: ORG_ID,
    project_id,
    user_id: user.id,
    action: 'install_complete',
    description: `Install marked complete. Difficulty: ${difficulty_rating}/5`,
    created_at: new Date().toISOString(),
  }).catch(() => {})

  return NextResponse.json({ success: true, project_id })
}
