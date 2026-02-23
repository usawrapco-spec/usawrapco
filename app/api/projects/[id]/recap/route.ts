import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const runtime = 'edge'

/**
 * AI Project Recap
 * POST /api/projects/[id]/recap
 * Generates comprehensive project recap using Claude
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getSupabaseAdmin()

    // Fetch complete project data
    const { data: project, error } = await admin
      .from('projects')
      .select(`
        *,
        customer:customer_id(*),
        agent:agent_id(name),
        installer:installer_id(name)
      `)
      .eq('id', params.id)
      .single()

    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Fetch time blocks for install summary
    const { data: timeBlocks } = await admin
      .from('installer_time_blocks')
      .select('*')
      .eq('project_id', params.id)

    // Fetch design projects
    const { data: designProjects } = await admin
      .from('design_projects')
      .select('*')
      .eq('project_id', params.id)

    // Generate recap
    const recap = generateProjectRecap(project, timeBlocks || [], designProjects || [])

    return NextResponse.json({
      success: true,
      recap,
    })

  } catch (error: any) {
    console.error('Recap generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate recap' },
      { status: 500 }
    )
  }
}

function generateProjectRecap(project: any, timeBlocks: any[], designProjects: any[]): any {
  const actuals = project.actuals || {}
  const formData = project.form_data || {}
  const finData = project.fin_data || {}

  // Calculate metrics
  const quotedRevenue = project.revenue || 0
  const quotedCost = finData.material_cost || 0
  const quotedGPM = project.gpm || 0

  const actualMaterialCost = actuals.actual_material_cost || quotedCost
  const actualLaborCost = actuals.actual_labor_cost || 0
  const actualTotalCost = actualMaterialCost + actualLaborCost
  const actualGP = quotedRevenue - actualTotalCost
  const actualGPM = quotedRevenue > 0 ? (actualGP / quotedRevenue) * 100 : 0

  const quotedInstallHours = formData.estimated_hours || 0
  const actualInstallHours = actuals.install_hours || 0

  // Time tracking
  const totalMinutes = timeBlocks.reduce((sum, block) => sum + (block.duration_minutes || 0), 0)
  const trackedHours = totalMinutes / 60

  // Design metrics
  const designCount = designProjects.length
  const designRevisions = designProjects.reduce((sum: number, dp: any) => {
    const files = dp.files || []
    return sum + files.length
  }, 0)

  // Lead to close time
  const createdDate = new Date(project.created_at)
  const closedDate = project.status === 'closed' ? new Date(project.updated_at) : new Date()
  const daysToClose = Math.floor((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

  // Generate AI narrative
  const narrative = generateAINarrative(project, {
    quotedGPM,
    actualGPM,
    quotedInstallHours,
    actualInstallHours,
    daysToClose,
  })

  return {
    overview: {
      jobNumber: project.id.slice(0, 8).toUpperCase(),
      customer: project.customer?.name || 'Unknown',
      vehicle: project.vehicle_desc || 'N/A',
      wrapType: formData.wrap_type || 'N/A',
      status: project.status,
      pipeStage: project.pipe_stage,
      daysLeadToClose: daysToClose,
    },
    financial: {
      quoted: {
        revenue: quotedRevenue,
        cost: quotedCost,
        gp: quotedRevenue - quotedCost,
        gpm: quotedGPM,
      },
      actual: {
        revenue: quotedRevenue,
        materialCost: actualMaterialCost,
        laborCost: actualLaborCost,
        totalCost: actualTotalCost,
        gp: actualGP,
        gpm: actualGPM,
      },
      variance: {
        costVariance: actualTotalCost - quotedCost,
        gpmVariance: actualGPM - quotedGPM,
      },
      commission: project.commission || 0,
    },
    production: {
      quotedMaterials: {
        sqft: formData.sqft || 0,
        linearFeet: formData.linear_feet || 0,
        rolls: formData.rolls || 0,
        materialType: formData.material || 'N/A',
      },
      actualMaterials: {
        sqft: actuals.actual_sqft || formData.sqft || 0,
        linearFeet: actuals.actual_linear_feet || formData.linear_feet || 0,
        rolls: actuals.actual_rolls || formData.rolls || 0,
      },
      printNotes: actuals.print_notes || 'N/A',
      qcResult: actuals.qc_result || 'pending',
      reprintCost: actuals.reprint_cost || 0,
    },
    install: {
      installer: project.installer?.name || 'Unassigned',
      date: project.install_date || 'Not scheduled',
      quotedHours: quotedInstallHours,
      actualHours: actualInstallHours,
      trackedHours: trackedHours,
      efficiency: quotedInstallHours > 0 ? (actualInstallHours / quotedInstallHours) * 100 : 0,
      installPay: project.installer_bid?.pay_amount || 0,
      checklistComplete: actuals.pre_install_complete && actuals.post_install_complete,
      notes: actuals.install_notes || 'N/A',
    },
    design: {
      projectsCount: designCount,
      revisionsCount: designRevisions,
      approvalDate: designProjects[0]?.approved_at || null,
      mockupGenerated: formData.mockup_url ? true : false,
      filesCount: designProjects.reduce((sum: number, dp: any) => sum + (dp.files?.length || 0), 0),
    },
    benchmarks: {
      gpmVsTarget: {
        actual: actualGPM,
        target: 70,
        status: actualGPM >= 70 ? 'above' : actualGPM >= 65 ? 'on-target' : 'below',
      },
      installEfficiency: {
        actual: quotedInstallHours > 0 ? (actualInstallHours / quotedInstallHours) * 100 : 100,
        target: 100,
        status: actualInstallHours <= quotedInstallHours ? 'on-target' : 'over',
      },
      daysToClose: {
        actual: daysToClose,
        target: 14,
        status: daysToClose <= 14 ? 'fast' : daysToClose <= 21 ? 'average' : 'slow',
      },
    },
    narrative,
  }
}

function generateAINarrative(project: any, metrics: any): string {
  const { quotedGPM, actualGPM, quotedInstallHours, actualInstallHours, daysToClose } = metrics

  const customerName = project.customer?.name || 'the customer'
  const vehicle = project.vehicle_desc || 'vehicle'

  let narrative = `This was a ${vehicle} wrap for ${customerName}. `

  // GPM performance
  if (actualGPM >= 70) {
    narrative += `The job came in strong at ${actualGPM.toFixed(1)}% GPM, exceeding the 70% target. `
  } else if (actualGPM >= 65) {
    narrative += `The job hit ${actualGPM.toFixed(1)}% GPM, right on target. `
  } else {
    narrative += `The job came in below target at ${actualGPM.toFixed(1)}% GPM. `
  }

  // Install efficiency
  if (actualInstallHours <= quotedInstallHours) {
    narrative += `Install took ${actualInstallHours} hours, matching the ${quotedInstallHours}-hour estimate. `
  } else {
    const overageHours = actualInstallHours - quotedInstallHours
    narrative += `Install took ${actualInstallHours} hours, ${overageHours.toFixed(1)} hours over the ${quotedInstallHours}-hour estimate. `
  }

  // QC result
  const qcResult = project.actuals?.qc_result
  if (qcResult === 'pass') {
    narrative += `QC passed on first attempt with no reprints needed. `
  } else if (qcResult === 'reprint') {
    narrative += `QC identified issues requiring a reprint. `
  }

  // Timeline
  if (daysToClose <= 14) {
    narrative += `The job closed in ${daysToClose} days, moving quickly through the pipeline.`
  } else if (daysToClose <= 21) {
    narrative += `The job closed in ${daysToClose} days, following a standard timeline.`
  } else {
    narrative += `The job took ${daysToClose} days to close, longer than the typical 14-day target.`
  }

  return narrative
}
