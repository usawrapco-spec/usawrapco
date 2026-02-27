import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import {
  calculateEnhancedCommission,
  calculatePayroll,
  DEFAULT_BASE_HOURLY_WEEKLY,
  DEFAULT_HOURLY_RATE,
} from '@/lib/commission'

export const dynamic = 'force-dynamic'

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
  const { period_start, period_end } = body
  if (!period_start || !period_end)
    return NextResponse.json({ error: 'period_start and period_end required' }, { status: 400 })

  const orgId = profile.org_id || ORG_ID

  // Fetch all active employees with pay settings
  const [employeesRes, paySettingsRes] = await Promise.all([
    admin.from('profiles')
      .select('id, name, email, role, active, division')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('name'),
    admin.from('employee_pay_settings')
      .select('*')
      .eq('org_id', orgId),
  ])

  const allEmployees = employeesRes.data || []
  const paySettings = paySettingsRes.data || []
  const paySettingsMap = new Map(paySettings.map(s => [s.user_id, s]))

  // Separate W2 and 1099 workers
  const w2Employees = allEmployees.filter(e => {
    const ps = paySettingsMap.get(e.id)
    const isContractor = ps?.worker_type === 'contractor'
    const isInstaller = e.role === 'installer'
    return !isContractor && !isInstaller
  })

  const contractors = allEmployees.filter(e => {
    const ps = paySettingsMap.get(e.id)
    return ps?.worker_type === 'contractor' || e.role === 'installer'
  })

  // Fetch time_blocks for the period
  const { data: timeBlocks } = await admin
    .from('time_blocks')
    .select('id, user_id, project_id, title, block_type, start_at, end_at, notes')
    .eq('org_id', orgId)
    .gte('start_at', `${period_start}T00:00:00`)
    .lte('start_at', `${period_end}T23:59:59`)
    .order('start_at')

  // Group time blocks by user
  const timeByUser: Record<string, { totalHours: number; blocks: any[] }> = {}
  for (const block of (timeBlocks || [])) {
    const userId = block.user_id
    if (!timeByUser[userId]) timeByUser[userId] = { totalHours: 0, blocks: [] }
    const start = new Date(block.start_at)
    const end = new Date(block.end_at)
    const hours = Math.max(0, (end.getTime() - start.getTime()) / 3600000)
    timeByUser[userId].totalHours += hours
    timeByUser[userId].blocks.push({ ...block, hours })
  }

  // Fetch projects closed/done during this period for commission calculation
  const { data: closedProjects } = await admin
    .from('projects')
    .select('id, title, agent_id, installer_id, revenue, profit, gpm, commission, pipe_stage, division, fin_data, referral, updated_at, vehicle_desc, form_data')
    .eq('org_id', orgId)
    .eq('pipe_stage', 'done')
    .gte('updated_at', `${period_start}T00:00:00`)
    .lte('updated_at', `${period_end}T23:59:59`)

  // Fetch installer bids (accepted) for projects completed in period
  const doneProjectIds = (closedProjects || []).map(p => p.id)
  let installerBids: any[] = []
  if (doneProjectIds.length > 0) {
    const { data } = await admin
      .from('installer_bids')
      .select('id, project_id, installer_id, pay_amount, hours_budget, status')
      .eq('org_id', orgId)
      .eq('status', 'accepted')
      .in('project_id', doneProjectIds)
    installerBids = data || []
  }

  // Build W2 employee calculations
  const w2Results = w2Employees.map(emp => {
    const ps = paySettingsMap.get(emp.id)
    const hourlyRate = ps?.hourly_rate || DEFAULT_HOURLY_RATE
    const timeData = timeByUser[emp.id]
    const hoursWorked = timeData?.totalHours || 0

    // Base pay: guaranteed minimum $800/week (40hrs * $20/hr)
    const basePay = ps?.pay_type === 'salary'
      ? (ps.salary_amount || DEFAULT_BASE_HOURLY_WEEKLY)
      : Math.max(hoursWorked * hourlyRate, DEFAULT_BASE_HOURLY_WEEKLY)

    // Commission from closed jobs this period
    const agentJobs = (closedProjects || []).filter(p => p.agent_id === emp.id)
    let commissionEarned = 0
    const jobDetails: any[] = []

    for (const job of agentJobs) {
      const fin = job.fin_data as any
      if (fin && fin.sales > 0) {
        const source = (job.form_data as any)?.lead_source || 'inbound'
        const result = calculateEnhancedCommission({
          totalSale: fin.sales || 0,
          materialCost: fin.material || 0,
          installLaborCost: fin.labor || 0,
          designFee: fin.designFee || 0,
          additionalFees: fin.misc || 0,
          source,
          usedTorq: true,
          isPPF: job.division === 'ppf',
        })
        commissionEarned += result.agentCommission
        jobDetails.push({
          id: job.id,
          title: job.title,
          vehicle: job.vehicle_desc,
          revenue: fin.sales,
          profit: fin.profit,
          gpm: fin.gpm,
          commission: result.agentCommission,
          source,
        })
      } else if (job.commission) {
        commissionEarned += job.commission
        jobDetails.push({
          id: job.id,
          title: job.title,
          vehicle: job.vehicle_desc,
          revenue: job.revenue || 0,
          profit: job.profit || 0,
          gpm: job.gpm || 0,
          commission: job.commission,
          source: 'calculated',
        })
      }
    }

    // WA State payroll formula
    const payroll = calculatePayroll(DEFAULT_BASE_HOURLY_WEEKLY, commissionEarned)

    return {
      user_id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      worker_type: 'w2' as const,
      hourly_rate: hourlyRate,
      hours_worked: Math.round(hoursWorked * 100) / 100,
      base_pay: payroll.basePay,
      commission_earned: Math.round(commissionEarned * 100) / 100,
      commission_bonus: Math.round(payroll.bonus * 100) / 100,
      total_pay: Math.round(payroll.totalPay * 100) / 100,
      jobs_closed: jobDetails,
      time_blocks: timeData?.blocks || [],
      status: 'pending' as const,
      gusto_employee_id: ps?.gusto_employee_id || null,
    }
  })

  // Build 1099 contractor (installer) calculations
  const contractorResults = contractors.map(inst => {
    const ps = paySettingsMap.get(inst.id)
    const timeData = timeByUser[inst.id]
    const hoursLogged = timeData?.totalHours || 0

    // Jobs completed — from installer_bids
    const instBids = installerBids.filter(b => b.installer_id === inst.id)
    const jobDetails: any[] = []
    let totalEarned = 0

    for (const bid of instBids) {
      const project = (closedProjects || []).find(p => p.id === bid.project_id)
      const flatRate = bid.pay_amount || 0
      totalEarned += flatRate
      jobDetails.push({
        id: bid.project_id,
        title: project?.title || 'Unknown Job',
        vehicle: project?.vehicle_desc || '',
        flat_rate: flatRate,
        hours_budget: bid.hours_budget || 0,
      })
    }

    // Also check projects where this installer is assigned but no bid exists
    const installerProjects = (closedProjects || []).filter(
      p => p.installer_id === inst.id && !instBids.some(b => b.project_id === p.id)
    )
    for (const proj of installerProjects) {
      const fin = proj.fin_data as any
      const laborPay = fin?.labor || 0
      if (laborPay > 0) {
        totalEarned += laborPay
        jobDetails.push({
          id: proj.id,
          title: proj.title,
          vehicle: proj.vehicle_desc || '',
          flat_rate: laborPay,
          hours_budget: 0,
        })
      }
    }

    return {
      user_id: inst.id,
      name: inst.name,
      email: inst.email,
      role: inst.role,
      worker_type: '1099' as const,
      hours_logged: Math.round(hoursLogged * 100) / 100,
      jobs_completed: jobDetails,
      total_jobs: jobDetails.length,
      total_earned: Math.round(totalEarned * 100) / 100,
      time_blocks: timeData?.blocks || [],
      status: 'pending' as const,
      gusto_employee_id: ps?.gusto_employee_id || null,
    }
  })

  const w2Total = w2Results.reduce((s, e) => s + e.total_pay, 0)
  const contractorTotal = contractorResults.reduce((s, e) => s + e.total_earned, 0)

  return NextResponse.json({
    period: { start: period_start, end: period_end },
    w2_employees: w2Results,
    contractors: contractorResults,
    totals: {
      w2_total: Math.round(w2Total * 100) / 100,
      contractor_total: Math.round(contractorTotal * 100) / 100,
      grand_total: Math.round((w2Total + contractorTotal) * 100) / 100,
      w2_count: w2Results.length,
      contractor_count: contractorResults.length,
    },
  })
}
