import { getSupabaseAdmin } from '@/lib/supabase/service'

/**
 * GET /api/reports/customer-report?projectId={id}
 * Customer-facing job summary — no internal financials, no commissions.
 * Shows job status, scope, install date, and contact info.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: project, error } = await admin
    .from('projects')
    .select(`
      id, title, vehicle_desc, type, division, status, pipe_stage,
      install_date, due_date, priority, revenue,
      form_data, actuals, notes,
      agent:agent_id(id, name, email),
      customer:customer_id(id, name, email, phone, business_name)
    `)
    .eq('id', projectId)
    .single()

  if (error || !project) return Response.json({ error: 'Project not found' }, { status: 404 })

  // Stage labels for customer-readable status
  const STAGE_LABELS: Record<string, string> = {
    sales_in:    'In Review',
    production:  'In Production',
    install:     'Install Scheduled',
    prod_review: 'Quality Check',
    sales_close: 'Completing',
    done:        'Complete',
  }

  const STATUS_LABELS: Record<string, string> = {
    estimate:          'Estimate',
    active:            'Active Order',
    in_production:     'In Production',
    install_scheduled: 'Install Scheduled',
    installed:         'Installed',
    qc:                'Quality Review',
    closing:           'Finalizing',
    closed:            'Complete',
    cancelled:         'Cancelled',
  }

  const form    = (project.form_data as Record<string, unknown>) || {}
  const actuals = (project.actuals as Record<string, unknown>) || {}

  const report = {
    ref:         project.id.slice(0, 8).toUpperCase(),
    generatedAt: new Date().toISOString(),
    company: {
      name:    'USA WRAP CO',
      phone:   '(555) 000-0000',
      email:   'info@usawrapco.com',
      website: 'usawrapco.com',
    },
    customer: (project as Record<string, unknown>).customer || { name: 'Customer' },
    agent: {
      name:  ((project as Record<string, unknown>).agent as Record<string, string> | null)?.name || 'Your Agent',
      email: ((project as Record<string, unknown>).agent as Record<string, string> | null)?.email || '',
    },
    job: {
      title:       project.title,
      vehicleDesc: project.vehicle_desc,
      type:        project.type,
      division:    project.division,
      statusLabel: STATUS_LABELS[project.status] || project.status,
      stageLabel:  STAGE_LABELS[project.pipe_stage] || project.pipe_stage,
      installDate: project.install_date,
      dueDate:     project.due_date,
      priority:    project.priority,
    },
    scope: {
      description:   (form.scope_of_work as string) || project.title,
      vehicleDetails: (form.vehicle_details as string) || project.vehicle_desc,
      wrapType:      (form.wrap_type as string) || project.type,
      coverageType:  (form.coverage_type as string) || 'Full Wrap',
      panels:        (form.panels as unknown[]) || [],
      notes:         project.notes,
    },
    financials: {
      totalPrice: project.revenue || 0,
    },
    signoff: {
      status:      (actuals.installerSignoff as string) || 'pending',
      completedAt: (actuals.signoff_completed_at as string) || null,
      signerName:  (actuals.signoff_signer_name as string) || null,
    },
    milestones: [
      { label: 'Order Placed',      done: true },
      { label: 'Design In Progress', done: ['production', 'install', 'prod_review', 'sales_close', 'done'].includes(project.pipe_stage) },
      { label: 'Production',         done: ['install', 'prod_review', 'sales_close', 'done'].includes(project.pipe_stage) },
      { label: 'Installation',       done: ['prod_review', 'sales_close', 'done'].includes(project.pipe_stage) },
      { label: 'Quality Check',      done: ['sales_close', 'done'].includes(project.pipe_stage) },
      { label: 'Complete',           done: project.pipe_stage === 'done' },
    ],
  }

  return Response.json({ report })
}
