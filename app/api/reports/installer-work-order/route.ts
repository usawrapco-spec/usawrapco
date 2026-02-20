import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: project } = await admin
    .from('projects')
    .select(`
      *,
      installer:installer_id(id, name, email, phone),
      customer:customer_id(id, name, email)
    `)
    .eq('id', projectId)
    .single()

  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

  const fin = project.fin_data || {}
  const form = project.form_data || {}
  const actuals = project.actuals || {}

  const installerPay = fin.labor || 0
  const billingRate = (form as Record<string, string | number>).installerBillingRate || 35
  const budgetHours = installerPay && billingRate ? (installerPay / Number(billingRate)).toFixed(1) : '0'

  const workOrder = {
    ref: project.id.slice(0, 8).toUpperCase(),
    generatedAt: new Date().toISOString(),
    installer: (project as Record<string, unknown>).installer,
    customer: (project as Record<string, unknown>).customer,
    vehicle: {
      description: project.vehicle_desc,
      wrapType: (form as Record<string, string>).wrapType || 'Full Wrap',
      totalSqft: (form as Record<string, string>).totalSqft || '0',
      wrapAreas: (form as Record<string, string>).wrapAreas || 'Full vehicle wrap',
      exclusionAreas: (form as Record<string, string>).exclusionAreas || 'None',
      accessNotes: (form as Record<string, string>).vehicleAccessNotes || '',
    },
    pay: {
      installerPay,
      billingRate,
      budgetHours,
      payRate: installerPay && Number(budgetHours) ? (installerPay / Number(budgetHours)).toFixed(2) : '0',
    },
    panels: Array.isArray((form as Record<string, unknown>).panels) ? (form as Record<string, unknown>).panels : [],
    installDate: project.install_date,
    materialType: (form as Record<string, string>).materialType || 'Avery MPI 1105',
    laminationType: (form as Record<string, string>).laminationType || 'Avery DOL 1460',
    // Sign-off tracking
    signoffStatus: (actuals as Record<string, string>).installerSignoff || 'pending',
    timeLog: (actuals as Record<string, unknown>).timeLog || [],
  }

  return Response.json({ workOrder })
}
