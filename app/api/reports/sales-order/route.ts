import { getSupabaseAdmin } from '@/lib/supabase/service'
import { calculateCommission } from '@/lib/commission'

/**
 * GET /api/reports/sales-order?projectId={id}
 * Returns structured sales order data that the front-end can render as a printable report.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: project, error } = await admin
    .from('projects')
    .select(`
      *,
      agent:agent_id(id, name, email),
      installer:installer_id(id, name, email),
      customer:customer_id(id, name, email)
    `)
    .eq('id', projectId)
    .single()

  if (error || !project) return Response.json({ error: 'Project not found' }, { status: 404 })

  const fin = project.fin_data || {}
  const form = project.form_data || {}

  const commResult = calculateCommission({
    totalSale: fin.sales || project.revenue || 0,
    materialCost: fin.material || 0,
    installLaborCost: fin.labor || 0,
    designFee: fin.designFee || 0,
    additionalFees: fin.misc || 0,
    source: (form as Record<string, string>).source || 'inbound',
  })

  const report = {
    ref: project.id.slice(0, 8).toUpperCase(),
    generatedAt: new Date().toISOString(),
    company: 'USA WRAP CO',
    customer: (project as Record<string, unknown>).customer || { name: 'Customer' },
    agent: (project as Record<string, unknown>).agent || { name: 'Agent' },
    installer: (project as Record<string, unknown>).installer || { name: 'TBD' },
    job: {
      title: project.title,
      vehicleDesc: project.vehicle_desc,
      type: project.type,
      division: project.division,
      status: project.status,
      installDate: project.install_date,
      dueDate: project.due_date,
      priority: project.priority,
    },
    financials: {
      totalSale: commResult.netProfit + commResult.totalCosts,
      materialCost: fin.material || 0,
      installLaborCost: fin.labor || 0,
      installHoursBudgeted: fin.laborHrs || 0,
      designFee: fin.designFee || 0,
      additionalFees: fin.misc || 0,
      netProfit: commResult.netProfit,
      grossProfitMargin: commResult.grossProfitMargin,
      agentCommission: commResult.agentCommission,
      agentCommissionRate: commResult.agentCommissionRate,
      productionBonus: commResult.productionBonus,
    },
    formData: project.form_data,
  }

  return Response.json({ report })
}
