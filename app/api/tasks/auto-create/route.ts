import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Auto-tasks to create when a job advances to a given stage
const AUTO_TASKS: Record<string, { title: string; description: string; due_days: number; role: string }[]> = {
  production: [
    { title: 'Print all materials',           description: 'Print vinyl panels per job spec. Log linear feet after printing.', due_days: 2, role: 'production' },
    { title: 'QC print quality before rolling', description: 'Check for banding, color accuracy, and edge bleed.', due_days: 2, role: 'production' },
    { title: 'Label and stage materials',     description: 'Label rolls with job # and stage for installer pickup.', due_days: 3, role: 'production' },
  ],
  install: [
    { title: 'Confirm installer schedule',    description: 'Call or text installer to confirm appointment time.', due_days: 1, role: 'installer' },
    { title: 'Prep vehicle intake photo',     description: 'Take pre-install photos of all 4 sides + roof.', due_days: 1, role: 'installer' },
    { title: 'Log install start time',        description: 'Clock in on job and record actual start time.', due_days: 1, role: 'installer' },
  ],
  prod_review: [
    { title: 'QC inspection — all panels',    description: 'Check for bubbles, lifting edges, seam alignment, and coverage completeness.', due_days: 0, role: 'production' },
    { title: 'Take post-install photos',      description: 'Photograph all panels, seams, corners, and customer-facing areas.', due_days: 0, role: 'production' },
    { title: 'Verify customer satisfaction',  description: 'Walk the job with the customer or get sign-off from sales on quality.', due_days: 1, role: 'sales_agent' },
  ],
  sales_close: [
    { title: 'Create and send final invoice', description: 'Generate invoice in system and send to customer via email.', due_days: 1, role: 'sales_agent' },
    { title: 'Collect balance payment',       description: 'Confirm payment received before releasing vehicle.', due_days: 2, role: 'sales_agent' },
    { title: 'Request Google review',         description: 'Send review request link to happy customer.', due_days: 3, role: 'sales_agent' },
    { title: 'Update CRM with deal outcome',  description: 'Mark deal won/lost with revenue and notes in CRM.', due_days: 1, role: 'sales_agent' },
  ],
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, to_stage, project_title } = body

  if (!project_id || !to_stage) return Response.json({ error: 'project_id and to_stage required' }, { status: 400 })

  const stageTasks = AUTO_TASKS[to_stage]
  if (!stageTasks || stageTasks.length === 0) return Response.json({ created: 0 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  // Check auto-tasks setting — respect org settings
  let autoTasksEnabled = true
  try {
    const { data: settings } = await admin
      .from('shop_settings')
      .select('settings_json')
      .eq('org_id', orgId)
      .single()
    const s = settings?.settings_json as any
    if (s?.auto_tasks_enabled === false) autoTasksEnabled = false
  } catch {}

  if (!autoTasksEnabled) return Response.json({ created: 0, reason: 'disabled' })

  const now = new Date()
  const inserts = stageTasks.map(t => {
    const due = new Date(now)
    due.setDate(due.getDate() + t.due_days)
    return {
      org_id: orgId,
      project_id,
      title: t.title,
      description: t.description,
      role: t.role,
      due_date: due.toISOString().split('T')[0],
      status: 'pending',
      source: 'auto_stage',
      priority: 'medium',
      created_by: user.id,
    }
  })

  const { data, error } = await admin.from('tasks').insert(inserts).select()

  if (error) return Response.json({ error: error.message, created: 0 })
  return Response.json({ created: data?.length || 0, tasks: data })
}
