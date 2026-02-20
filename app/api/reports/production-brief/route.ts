import { getSupabaseAdmin } from '@/lib/supabase/service'
import { calculateCommission } from '@/lib/commission'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: project } = await admin
    .from('projects')
    .select(`
      *,
      agent:agent_id(id, name),
      installer:installer_id(id, name),
      customer:customer_id(id, name)
    `)
    .eq('id', projectId)
    .single()

  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

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

  // Try to load panel data from form_data
  const panels = (form as Record<string, unknown>).panels || []

  const brief = {
    ref: project.id.slice(0, 8).toUpperCase(),
    generatedAt: new Date().toISOString(),
    customer: (project as Record<string, unknown>).customer,
    agent: (project as Record<string, unknown>).agent,
    installer: (project as Record<string, unknown>).installer,
    vehicle: {
      description: project.vehicle_desc,
      wrapType: (form as Record<string, string>).wrapType || 'Full Wrap',
      coveragePercent: (form as Record<string, string>).coveragePercent || 100,
      materialType: (form as Record<string, string>).materialType || 'Avery MPI 1105',
      laminationType: (form as Record<string, string>).laminationType || 'Avery DOL 1460',
      materialRate: fin.material && (form as Record<string, string>).totalSqft
        ? (fin.material / parseFloat((form as Record<string, string>).totalSqft)).toFixed(2)
        : '2.10',
      totalSqft: (form as Record<string, string>).totalSqft || '0',
      wrapAreas: (form as Record<string, string>).wrapAreas || 'Full vehicle wrap',
      exclusionAreas: (form as Record<string, string>).exclusionAreas || 'None specified',
    },
    panels: Array.isArray(panels) ? panels : [],
    financials: {
      materialCost: fin.material || 0,
      productionBonus: commResult.productionBonus,
      designFee: fin.designFee || 0,
    },
    designRequired: (form as Record<string, unknown>).designRequired !== false,
    installDate: project.install_date,
  }

  return Response.json({ brief })
}
