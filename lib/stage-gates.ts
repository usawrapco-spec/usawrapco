/**
 * Stage Gates System
 * Defines requirements for advancing jobs through pipeline stages
 */

import type { Project, PipeStage } from '@/types'

export interface StageGate {
  stage: PipeStage
  nextStage: PipeStage | null
  requirements: GateRequirement[]
}

export interface GateRequirement {
  key: string
  label: string
  check: (project: Project) => boolean
  failureMessage: string
}

export interface GateStatus {
  canAdvance: boolean
  missingRequirements: string[]
  nextStep: string | null
}

/**
 * Stage gate definitions
 */
export const STAGE_GATES: Record<PipeStage, StageGate> = {
  sales_in: {
    stage: 'sales_in',
    nextStage: 'production',
    requirements: [
      {
        key: 'has_customer',
        label: 'Customer information complete',
        check: (p) => !!p.customer_id,
        failureMessage: 'Add customer information',
      },
      {
        key: 'has_vehicle',
        label: 'Vehicle description entered',
        check: (p) => !!p.vehicle_desc && p.vehicle_desc.trim().length > 0,
        failureMessage: 'Enter vehicle description',
      },
      {
        key: 'has_revenue',
        label: 'Sale price set',
        check: (p) => !!p.revenue && p.revenue > 0,
        failureMessage: 'Enter sale price',
      },
      {
        key: 'has_line_items',
        label: 'At least one line item added',
        check: (p) => {
          const formData = p.form_data as Record<string, unknown>
          const lineItems = (formData?.line_items as any[]) || []
          return lineItems.length > 0
        },
        failureMessage: 'Add at least one line item',
      },
    ],
  },

  production: {
    stage: 'production',
    nextStage: 'install',
    requirements: [
      {
        key: 'materials_logged',
        label: 'Materials logged',
        check: (p) => {
          const actuals = p.actuals as Record<string, unknown>
          return !!actuals?.materials_logged
        },
        failureMessage: 'Log materials used in production',
      },
      {
        key: 'print_notes',
        label: 'Print notes filled',
        check: (p) => {
          const actuals = p.actuals as Record<string, unknown>
          return !!actuals?.print_notes && (actuals.print_notes as string).trim().length > 0
        },
        failureMessage: 'Add print notes',
      },
      {
        key: 'production_signoff',
        label: 'Production sign-off',
        check: (p) => {
          const checkout = p.checkout as Record<string, boolean>
          return checkout?.production === true
        },
        failureMessage: 'Sign off on production completion',
      },
    ],
  },

  install: {
    stage: 'install',
    nextStage: 'prod_review',
    requirements: [
      {
        key: 'pre_install_checklist',
        label: 'Pre-install checklist complete',
        check: (p) => {
          const actuals = p.actuals as Record<string, unknown>
          return !!actuals?.pre_install_complete
        },
        failureMessage: 'Complete pre-install checklist',
      },
      {
        key: 'post_install_checklist',
        label: 'Post-install checklist complete',
        check: (p) => {
          const actuals = p.actuals as Record<string, unknown>
          return !!actuals?.post_install_complete
        },
        failureMessage: 'Complete post-install checklist',
      },
      {
        key: 'time_tracking_closed',
        label: 'Time tracking closed',
        check: (p) => {
          const actuals = p.actuals as Record<string, unknown>
          return !!actuals?.install_hours && (actuals.install_hours as number) > 0
        },
        failureMessage: 'Close time tracking and log install hours',
      },
      {
        key: 'installer_signature',
        label: 'Installer signature captured',
        check: (p) => {
          const actuals = p.actuals as Record<string, unknown>
          return !!actuals?.installer_signature
        },
        failureMessage: 'Capture installer signature',
      },
    ],
  },

  prod_review: {
    stage: 'prod_review',
    nextStage: 'sales_close',
    requirements: [
      {
        key: 'qc_result',
        label: 'QC result selected',
        check: (p) => {
          const actuals = p.actuals as Record<string, unknown>
          return !!actuals?.qc_result && ['pass', 'reprint', 'fix'].includes(actuals.qc_result as string)
        },
        failureMessage: 'Select QC result (Pass/Reprint/Fix)',
      },
    ],
  },

  sales_close: {
    stage: 'sales_close',
    nextStage: 'done',
    requirements: [
      {
        key: 'actuals_entered',
        label: 'Actual costs entered',
        check: (p) => {
          const actuals = p.actuals as Record<string, unknown>
          return !!actuals?.actual_material_cost || !!actuals?.actual_labor_cost
        },
        failureMessage: 'Enter actual material and labor costs',
      },
      {
        key: 'final_sale_price',
        label: 'Final sale price confirmed',
        check: (p) => !!p.revenue && p.revenue > 0,
        failureMessage: 'Confirm final sale price',
      },
      {
        key: 'sales_signoff',
        label: 'Sales sign-off',
        check: (p) => {
          const checkout = p.checkout as Record<string, boolean>
          return checkout?.sales_close === true
        },
        failureMessage: 'Sign off on job close',
      },
    ],
  },

  done: {
    stage: 'done',
    nextStage: null,
    requirements: [],
  },
}

/**
 * Check if a project can advance to the next stage
 */
export function checkStageGate(project: Project): GateStatus {
  const currentGate = STAGE_GATES[project.pipe_stage || 'sales_in']

  if (!currentGate) {
    return {
      canAdvance: false,
      missingRequirements: ['Invalid stage'],
      nextStep: null,
    }
  }

  const missingRequirements: string[] = []

  for (const req of currentGate.requirements) {
    if (!req.check(project)) {
      missingRequirements.push(req.failureMessage)
    }
  }

  const canAdvance = missingRequirements.length === 0
  const nextStep = canAdvance
    ? null
    : `⚠ ${missingRequirements[0]}`

  return {
    canAdvance,
    missingRequirements,
    nextStep,
  }
}

/**
 * Get next step message for a project
 */
export function getNextStepMessage(project: Project): string {
  const status = checkStageGate(project)

  if (status.canAdvance) {
    return '✓ Ready to advance to next stage'
  }

  return status.nextStep || 'Complete all requirements to advance'
}

/**
 * Get bottleneck indicator for pipeline cards
 */
export function getBottleneckIndicator(project: Project, daysInStage: number): {
  color: string
  label: string
} {
  const status = checkStageGate(project)

  // Blocked by missing requirements
  if (!status.canAdvance) {
    return {
      color: 'red',
      label: 'Blocked',
    }
  }

  // Stuck in stage too long
  const thresholds: Record<PipeStage, number> = {
    sales_in: 7,
    production: 5,
    install: 3,
    prod_review: 2,
    sales_close: 3,
    done: 999,
  }

  const threshold = thresholds[project.pipe_stage || 'sales_in']

  if (daysInStage > threshold) {
    return {
      color: 'amber',
      label: `${daysInStage}d in stage`,
    }
  }

  return {
    color: 'green',
    label: 'On track',
  }
}
