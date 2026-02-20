/**
 * lib/commission.ts
 * Commission calculation engine for USA WRAP CO.
 * All calculations match the PDF reference format.
 */

export interface CommissionInput {
  totalSale: number
  materialCost: number
  installLaborCost: number
  designFee: number
  additionalFees: number
  customerExpenses?: number
  source: 'inbound' | 'outbound' | 'referral' | 'walk_in' | 'repeat' | 'cross_referral' | 'presold'
  agentCommissionOverride?: number   // null = use source default
  productionBonusRate?: number       // default 0.05 (5%)
  crossReferralRate?: number         // default 0.025 (2.5%)
  hasCrossReferral?: boolean
}

export interface CommissionResult {
  netProfit: number
  grossProfitMargin: number
  agentCommission: number
  agentCommissionRate: number
  productionBonus: number
  crossReferralCommission: number
  totalCosts: number
  breakdown: {
    label: string
    amount: number
    note?: string
  }[]
}

// Commission rates by source
const SOURCE_RATES: Record<string, number> = {
  inbound:       0.045,  // 4.5% of net profit
  outbound:      0.06,   // 6%
  referral:      0.05,   // 5%
  walk_in:       0.04,   // 4%
  repeat:        0.035,  // 3.5%
  cross_referral: 0.05,  // 5%
  presold:       0.03,   // 3%
}

export function calculateCommission(input: CommissionInput): CommissionResult {
  const {
    totalSale,
    materialCost,
    installLaborCost,
    designFee,
    additionalFees,
    customerExpenses = 0,
    source,
    agentCommissionOverride,
    productionBonusRate = 0.05,
    crossReferralRate = 0.025,
    hasCrossReferral = false,
  } = input

  // Net profit
  const totalCosts = materialCost + installLaborCost + designFee + additionalFees + customerExpenses
  const netProfit = totalSale - totalCosts
  const grossProfitMargin = totalSale > 0 ? (netProfit / totalSale) * 100 : 0

  // Agent commission
  const agentRate = agentCommissionOverride ?? SOURCE_RATES[source] ?? SOURCE_RATES.inbound
  const agentCommission = Math.max(0, netProfit * agentRate)

  // Production bonus: 5% × (net profit − design fee), min 0
  const productionBonus = Math.max(0, (netProfit * productionBonusRate) - designFee)

  // Cross-referral commission (paid to referring agent)
  const crossReferralCommission = hasCrossReferral ? Math.max(0, netProfit * crossReferralRate) : 0

  const breakdown = [
    { label: 'Total Sale', amount: totalSale },
    { label: 'Material Cost', amount: -materialCost, note: `${((materialCost / totalSale) * 100).toFixed(0)}%` },
    { label: 'Install Labor', amount: -installLaborCost, note: `${((installLaborCost / totalSale) * 100).toFixed(0)}%` },
    { label: 'Design Fee', amount: -designFee },
    ...(additionalFees > 0 ? [{ label: 'Additional Fees', amount: -additionalFees }] : []),
    ...(customerExpenses > 0 ? [{ label: 'Customer Expenses', amount: -customerExpenses }] : []),
    { label: 'Net Profit', amount: netProfit, note: `${grossProfitMargin.toFixed(1)}% GPM` },
    { label: `Agent Commission (${source} ${(agentRate * 100).toFixed(1)}% GP)`, amount: -agentCommission },
    { label: 'Production Bonus', amount: -productionBonus, note: `5% × profit − design fee` },
    ...(hasCrossReferral ? [{ label: `Cross-Referral (${(crossReferralRate * 100).toFixed(1)}%)`, amount: -crossReferralCommission }] : []),
  ]

  return {
    netProfit,
    grossProfitMargin,
    agentCommission,
    agentCommissionRate: agentRate,
    productionBonus,
    crossReferralCommission,
    totalCosts,
    breakdown,
  }
}

/**
 * Format as currency string
 */
export const fCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

/**
 * XP values (from spec)
 */
export const XP_VALUES = {
  daily_login: 5,
  create_lead: 10,
  send_onboarding_link: 5,
  intake_submitted: 15,
  deal_won: 100,
  deal_lost: 5,
  create_design: 10,
  design_approved_no_revisions: 50,
  design_approved_with_revisions: 30,
  production_brief_completed: 15,
  customer_signoff: 20,
  print_job_completed: 15,
  install_completed: 25,
  job_fully_completed: 75,
  invoice_paid: 30,
  media_upload: 5,
  log_expense: 3,
  installer_bid: 5,
  maintenance_logged: 10,
} as const

export type XPAction = keyof typeof XP_VALUES

/**
 * Calculate XP level from total XP
 */
export const XP_LEVELS: number[] = [
  0, 50, 150, 300, 500, 750, 1000, 1250, 1500, 1750,
  2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 7000,
  8000, 9000, 10000, 11000, 12500, 14000, 15500, 17000, 18500, 20000,
  20000, 22500, 25000, 27500, 30000, 32500, 35000, 37500, 40000, 42500,
  40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 100000,
]

export function xpToLevel(xp: number): number {
  let level = 1
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i]) level = i + 1
    else break
  }
  return Math.min(level, 50)
}

export function xpForNextLevel(currentXp: number): { current: number; next: number; progress: number } {
  const level = xpToLevel(currentXp)
  const currentLevelXp = XP_LEVELS[level - 1] ?? 0
  const nextLevelXp = XP_LEVELS[level] ?? XP_LEVELS[XP_LEVELS.length - 1]
  const progress = nextLevelXp > currentLevelXp
    ? ((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 100
  return { current: currentLevelXp, next: nextLevelXp, progress: Math.min(100, progress) }
}
