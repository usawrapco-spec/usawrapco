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

// Commission rates by source (base rates on Gross Profit)
const SOURCE_RATES: Record<string, number> = {
  inbound:       0.045,  // 4.5% of GP
  outbound:      0.07,   // 7% of GP
  referral:      0.045,  // 4.5% of GP (same as inbound)
  walk_in:       0.045,  // 4.5% of GP
  repeat:        0.045,  // 4.5% of GP
  cross_referral: 0.025, // 2.5% cross-department referral
  presold:       0.05,   // 5% flat, no bonuses
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

// ---------------------------------------------------------------------------
// Payroll & Advanced Commission Structure
// ---------------------------------------------------------------------------

/**
 * Commission caps by source type
 */
export const COMMISSION_CAPS: Record<string, number> = {
  inbound: 0.075,   // Max 7.5% on inbound leads
  outbound: 0.10,   // Max 10% on outbound leads
  referral: 0.075,
  walk_in: 0.075,
  repeat: 0.075,
  cross_referral: 0.075,
  presold: 0.05,
}

/**
 * Cross-department referral rate (wraps <-> decking referrals)
 */
export const CROSS_DEPT_REFERRAL_RATE = 0.025 // 2.5%

/**
 * Monthly GP tiers — higher tiers unlock better commission rates
 */
export const MONTHLY_GP_TIERS = [
  { tier: 1, minGP: 0,      maxGP: 50000,  rateBonus: 0 },         // $0-50k: base rates
  { tier: 2, minGP: 50001,  maxGP: 100000, rateBonus: 0.005 },     // $50k-100k: +0.5%
  { tier: 3, minGP: 100001, maxGP: Infinity, rateBonus: 0.015 },    // $100k+: +1.5%
]

/**
 * Get the monthly GP tier bonus based on cumulative gross profit
 */
export function getMonthlyGPTierBonus(monthlyGP: number): number {
  const tier = MONTHLY_GP_TIERS.find(t => monthlyGP >= t.minGP && monthlyGP <= t.maxGP)
  return tier?.rateBonus ?? 0
}

/**
 * Protection rule: If GPM < 65%, agent gets base rate only (no bonuses)
 * Prevents underquoting — inbound→4.5%, outbound→7%, no bonuses
 */
export function isGPMProtected(gpm: number, isPPF: boolean): boolean {
  if (isPPF) return false // PPF jobs are exempt
  return gpm < 65
}

/**
 * Torq bonus: +1% of gross profit when Torq CRM is used for the deal
 */
export const TORQ_BONUS_RATE = 0.01

/**
 * High GPM bonus: +2% of gross profit when GPM > 73%
 */
export const HIGH_GPM_BONUS_RATE = 0.02
export const HIGH_GPM_THRESHOLD = 73

/**
 * Calculate enhanced commission with all bonuses and caps
 */
export function calculateEnhancedCommission(input: CommissionInput & {
  isPPF?: boolean
  usedTorq?: boolean
  monthlyGPCumulative?: number
}): CommissionResult & {
  torqBonus: number
  highGPMBonus: number
  gpTierBonus: number
  cappedRate: number
  protectionApplied: boolean
} {
  const base = calculateCommission(input)
  const {
    source,
    isPPF = false,
    usedTorq = false,
    monthlyGPCumulative = 0,
  } = input

  const protected_ = isGPMProtected(base.grossProfitMargin, isPPF)

  // Torq bonus: +1% GP (only if not protected)
  const torqBonus = (!protected_ && usedTorq) ? base.netProfit * TORQ_BONUS_RATE : 0

  // High GPM bonus: +2% GP when GPM > 73% (only if not protected)
  const highGPMBonus = (!protected_ && base.grossProfitMargin > HIGH_GPM_THRESHOLD)
    ? base.netProfit * HIGH_GPM_BONUS_RATE
    : 0

  // Monthly GP tier bonus
  const gpTierRate = getMonthlyGPTierBonus(monthlyGPCumulative)
  const gpTierBonus = (!protected_) ? base.netProfit * gpTierRate : 0

  // Apply cap — total effective rate includes base + tier, capped per source
  const maxRate = COMMISSION_CAPS[source] ?? 0.075
  const effectiveRate = Math.min(base.agentCommissionRate + gpTierRate, maxRate)
  const cappedCommission = Math.max(0, base.netProfit * effectiveRate)

  // Total commission = capped base+tier commission + torq bonus + high GPM bonus
  const totalCommission = protected_
    ? Math.max(0, base.netProfit * (SOURCE_RATES[source] ?? SOURCE_RATES.inbound))
    : cappedCommission + torqBonus + highGPMBonus

  return {
    ...base,
    agentCommission: totalCommission,
    torqBonus,
    highGPMBonus,
    gpTierBonus,
    cappedRate: effectiveRate,
    protectionApplied: protected_,
  }
}

/**
 * WA State payroll formula:
 * Total Pay = Base Hourly + MAX(0, Commission - Base Hourly)
 *
 * This ensures the employee always receives at least their base hourly pay.
 * Commission is only added as a bonus above the base hourly amount.
 *
 * @param baseHourly  - Base hourly pay for the period (default: 40hrs x $20/hr = $800/week)
 * @param commissionEarned - Total commission earned in the period
 */
export function calculatePayroll(
  baseHourly: number,
  commissionEarned: number,
): {
  basePay: number
  commission: number
  bonus: number
  totalPay: number
} {
  const bonus = Math.max(0, commissionEarned - baseHourly)
  return {
    basePay: baseHourly,
    commission: commissionEarned,
    bonus,
    totalPay: baseHourly + bonus,
  }
}

/**
 * Default base hourly pay: 40 hours x $20/hr = $800/week
 */
export const DEFAULT_BASE_HOURLY_WEEKLY = 40 * 20 // $800
export const DEFAULT_HOURLY_RATE = 20
