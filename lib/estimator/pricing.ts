import type { LineItemState, LineItemCalc, Coverage } from './types'
import { SIZE_SQFT, TIER_SIZE_MAP } from './types'
import { VAN_PRICING, PPF_PACKAGES } from './vehicleDb'

const MATERIAL_BUFFER = 1.12 // 12% waste buffer

// ─── Box Truck Sqft Calculator ─────────────────────────────────────────────
export function calcBoxTruckSqft(
  lengthFt: number,
  heightIn: number,
  sides: { left: boolean; right: boolean; rear: boolean }
): number {
  const heightFt = heightIn / 12
  const sideSqft = lengthFt * heightFt
  let total = 0
  if (sides.left) total += sideSqft
  if (sides.right) total += sideSqft
  if (sides.rear) total += heightFt * 8 // ~8ft wide rear door
  return Math.round(total)
}

// ─── Trailer Sqft Calculator ───────────────────────────────────────────────
export function calcTrailerSqft(
  lengthFt: number,
  heightFt: number,
  sides: { left: boolean; right: boolean; front: boolean; rear: boolean },
  frontCoverage: string,
  vnose: string,
  vnoseH: number,
  vnoseL: number
): number {
  const sideSqft = lengthFt * heightFt
  let total = 0
  if (sides.left) total += sideSqft
  if (sides.right) total += sideSqft

  if (sides.front) {
    const frontSqft = 8 * heightFt // ~8ft wide front
    const coverageMult = frontCoverage === 'full' ? 1 : frontCoverage === 'threequarter' ? 0.75 : 0.5
    total += frontSqft * coverageMult
  }

  if (sides.rear) {
    total += 8 * heightFt // rear doors
  }

  // V-nose addition
  if (vnose === 'half_standard') {
    total += lengthFt * 0.5 * 2 // small v-nose both sides
  } else if (vnose === 'custom' && vnoseH > 0 && vnoseL > 0) {
    total += vnoseH * vnoseL * 2 // custom v-nose both sides
  }

  return Math.round(total)
}

// ─── Marine Sqft Calculator ────────────────────────────────────────────────
export function calcMarineSqft(
  hullLength: number,
  hullHeight: number,
  passes: number,
  transom: boolean
): {
  netSqft: number
  withWaste: number
  linearFtPerSide: number
  totalToOrder: number
  transomSqft: number
} {
  const materialWidthFt = 4.5 // 54" wide = 4.5ft
  const netSqft = hullLength * hullHeight * 2 // both sides
  const withWaste = Math.round(netSqft * 1.2) // 20% waste buffer
  const linearFtPerSide = Math.ceil(hullLength * passes)
  const totalToOrder = linearFtPerSide * 2 // both sides
  const transomSqft = transom ? Math.round(hullHeight * materialWidthFt) : 0

  return { netSqft: Math.round(netSqft), withWaste, linearFtPerSide, totalToOrder, transomSqft }
}

// ─── PPF Total Calculator ──────────────────────────────────────────────────
export function calcPPFTotal(selectedIds: string[]): {
  salePrice: number
  matCost: number
  totalYards: number
} {
  let salePrice = 0
  let matCost = 0
  let totalYards = 0

  for (const id of selectedIds) {
    const pkg = PPF_PACKAGES.find(p => p.id === id)
    if (pkg) {
      salePrice += pkg.sale
      matCost += pkg.matCost
      totalYards += pkg.yards
    }
  }

  return { salePrice, matCost, totalYards }
}

// ─── Get Vehicle Sqft from DB ──────────────────────────────────────────────
function getVehicleSqft(item: LineItemState): number {
  // If vehicle data is available, use it
  if (item.vData) {
    const coverage = item.coverage || 'full'
    return item.vData.sqft[coverage] || 0
  }
  // Fallback to manually entered sqft
  return item.sqft || 0
}

// ─── Get Van Pricing (if applicable) ───────────────────────────────────────
function getVanMatrixPrice(item: LineItemState): number | null {
  if (!item.vData) return null
  const size = item.vData.size
  const coverage = item.coverage || 'full'
  const priceRow = VAN_PRICING[size]
  if (!priceRow) return null
  return priceRow[coverage] || null
}

// ─── Solve Sale Price for Target GPM ───────────────────────────────────────
function solveSalePrice(
  matCost: number,
  designFee: number,
  installRateMode: 'pct' | 'flat',
  laborPct: number,
  laborFlat: number,
  targetGPM: number
): number {
  const gpmDec = targetGPM / 100
  const laborDec = laborPct / 100

  if (installRateMode === 'pct') {
    // sale = (matCost + design) / (1 - gpm - laborPct)
    const denom = 1 - gpmDec - laborDec
    if (denom <= 0) return 0
    return Math.round((matCost + designFee) / denom)
  } else {
    // sale = (matCost + design + laborFlat) / (1 - gpm)
    const denom = 1 - gpmDec
    if (denom <= 0) return 0
    return Math.round((matCost + designFee + laborFlat) / denom)
  }
}

// ─── Main Line Item Calculator ─────────────────────────────────────────────
export function calcLineItem(item: LineItemState): LineItemCalc {
  // PPF is priced by packages, not formula
  if (item.type === 'ppf') {
    const ppf = calcPPFTotal(item.ppfSelected || [])
    const design = item.designFee || 0
    const labor = item.installRateMode === 'pct'
      ? ppf.salePrice * (item.laborPct / 100)
      : item.laborFlat
    const cogs = ppf.matCost + labor + design
    const profit = ppf.salePrice - cogs
    const gpm = ppf.salePrice > 0 ? (profit / ppf.salePrice) * 100 : 0

    return {
      salePrice: ppf.salePrice,
      matCost: ppf.matCost,
      labor,
      design,
      cogs,
      profit,
      gpm,
      effectiveLaborPct: ppf.salePrice > 0 ? (labor / ppf.salePrice) * 100 : 0,
    }
  }

  // Calculate sqft based on type
  let sqft = 0
  let extraRevenue = 0

  switch (item.type) {
    case 'vehicle':
      sqft = getVehicleSqft(item)
      if (item.includeRoof && item.roofSqft > 0) {
        sqft += item.roofSqft
      }
      break

    case 'boxtruck':
      sqft = calcBoxTruckSqft(
        item.btLength || 0,
        item.btHeight || 96,
        item.btSides || { left: true, right: true, rear: false }
      )
      if (item.btCab) extraRevenue = 1950
      break

    case 'trailer':
      sqft = calcTrailerSqft(
        item.trLength || 0,
        item.trHeight || 0,
        item.trSides || { left: true, right: true, front: false, rear: false },
        item.trFrontCoverage || 'full',
        item.trVnose || 'none',
        item.trVnoseH || 0,
        item.trVnoseL || 0
      )
      break

    case 'marine': {
      const marine = calcMarineSqft(
        item.marHullLength || 0,
        item.marHullHeight || 0,
        item.marPasses || 2,
        item.marTransom || false
      )
      // Use netSqft so MATERIAL_BUFFER (12%) applies as the only waste factor.
      // withWaste already has 20% baked in — using it here would double-count waste.
      sqft = marine.netSqft + marine.transomSqft
      break
    }

    default:
      // Custom, signage, wallwrap, apparel, print, decking
      sqft = item.sqft || 0
      break
  }

  // Material cost
  const matCost = Math.round(sqft * item.matRate * MATERIAL_BUFFER)
  const design = item.designFee || 150

  // Sale price logic (before cab/roof addon — addons are pure revenue, no COGS)
  let salePrice = 0

  if (item.manualSale && item.salePrice > 0) {
    // Manual override
    salePrice = item.salePrice
  } else if (item.type === 'vehicle') {
    // Check for van pricing matrix
    const matrixPrice = getVanMatrixPrice(item)
    if (matrixPrice) {
      salePrice = matrixPrice
    } else {
      salePrice = solveSalePrice(matCost, design, item.installRateMode, item.laborPct, item.laborFlat, item.targetGPM)
    }
  } else {
    salePrice = solveSalePrice(matCost, design, item.installRateMode, item.laborPct, item.laborFlat, item.targetGPM)
  }

  // Labor calculated on base sale BEFORE cab/roof addon (addon is pure margin)
  const labor = item.installRateMode === 'pct'
    ? Math.round(salePrice * (item.laborPct / 100))
    : item.laborFlat

  // Add box truck cab addon to revenue only (no additional COGS)
  salePrice += extraRevenue

  // COGS & Profit
  const cogs = matCost + labor + design
  const profit = salePrice - cogs
  const gpm = salePrice > 0 ? (profit / salePrice) * 100 : 0
  const effectiveLaborPct = salePrice > 0 ? (labor / salePrice) * 100 : 0

  return {
    salePrice,
    matCost,
    labor,
    design,
    cogs,
    profit,
    gpm,
    effectiveLaborPct,
  }
}

// ─── Aggregate Totals ──────────────────────────────────────────────────────
export function calcTotals(items: LineItemState[]): {
  totalRevenue: number
  totalMaterial: number
  totalLabor: number
  totalDesign: number
  totalCogs: number
  totalProfit: number
  blendedGPM: number
} {
  const nonOptional = items.filter(i => !i.isOptional)
  let totalRevenue = 0
  let totalMaterial = 0
  let totalLabor = 0
  let totalDesign = 0

  for (const item of nonOptional) {
    const calc = item._calc || calcLineItem(item)
    totalRevenue += calc.salePrice
    totalMaterial += calc.matCost
    totalLabor += calc.labor
    totalDesign += calc.design
  }

  const totalCogs = totalMaterial + totalLabor + totalDesign
  const totalProfit = totalRevenue - totalCogs
  const blendedGPM = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  return { totalRevenue, totalMaterial, totalLabor, totalDesign, totalCogs, totalProfit, blendedGPM }
}
