// ─── Line Items Engine Types ────────────────────────────────────────────────

export type ProductType =
  | 'vehicle' | 'boxtruck' | 'trailer' | 'marine'
  | 'ppf' | 'decking' | 'wallwrap' | 'signage'
  | 'apparel' | 'print' | 'custom'

export type InstallRateMode = 'pct' | 'flat'

export type Coverage = 'full' | 'threequarter' | 'half'

export type VehicleSize = 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge'

/** Calculated pricing for a single line item */
export interface LineItemCalc {
  salePrice: number
  matCost: number
  labor: number
  design: number
  cogs: number
  profit: number
  gpm: number
  effectiveLaborPct: number
}

/** Vehicle data from the vehicle database */
export interface VehicleData {
  size: VehicleSize
  sqft: { half: number; threequarter: number; full: number }
  roof?: number
}

/** Full state for a single line item */
export interface LineItemState {
  id: string
  isOptional: boolean
  type: ProductType
  name: string
  collapsed: boolean
  showStdRates: boolean

  // Vehicle
  year?: string
  make?: string
  model?: string
  coverage?: Coverage
  sqft: number
  roofSqft: number
  includeRoof: boolean
  vData?: VehicleData

  // Box truck
  btLength?: number
  btHeight?: number
  btSides?: { left: boolean; right: boolean; rear: boolean }
  btCab?: boolean

  // Trailer
  trLength?: number
  trHeight?: number
  trSides?: { left: boolean; right: boolean; front: boolean; rear: boolean }
  trFrontCoverage?: string
  trVnose?: string
  trVnoseH?: number
  trVnoseL?: number

  // Marine
  marHullLength?: number
  marHullHeight?: number
  marPasses?: number
  marTransom?: boolean

  // PPF
  ppfSelected?: string[]

  // Pricing
  matId: string
  matRate: number
  designFee: number
  installRateMode: InstallRateMode
  laborPct: number
  laborFlat: number
  targetGPM: number
  salePrice: number
  manualSale: boolean

  // Photos
  photos: string[]

  // Internal
  _calc?: LineItemCalc
  isRoofItem?: boolean
}

/** Standard install rate entry */
export interface StdInstallRate {
  name: string
  pay: number
  hrs: number
  cat: string
}

/** Material option */
export interface MaterialOption {
  id: string
  name: string
  rate: number
}

/** PPF package option */
export interface PPFPackage {
  id: string
  name: string
  sale: number
  matCost: number
  yards: number
}

/** Proposal grouping */
export interface Proposal {
  id: string
  name: string
  itemIds: string[]
}

/** Tier-to-size mapping for vehicles.json integration */
export const TIER_SIZE_MAP: Record<string, VehicleSize> = {
  small_car: 'small',
  med_car: 'medium',
  full_car: 'medium',
  sm_truck: 'medium',
  full_truck: 'large',
  med_van: 'medium',
  large_van: 'large',
  xl_van: 'xlarge',
  box_truck: 'xxlarge',
}

/** Default sqft by size and coverage */
export const SIZE_SQFT: Record<VehicleSize, { half: number; threequarter: number; full: number; roof: number }> = {
  small:   { half: 75,  threequarter: 115, full: 150, roof: 20 },
  medium:  { half: 100, threequarter: 160, full: 220, roof: 28 },
  large:   { half: 130, threequarter: 200, full: 280, roof: 35 },
  xlarge:  { half: 165, threequarter: 240, full: 330, roof: 42 },
  xxlarge: { half: 200, threequarter: 290, full: 380, roof: 50 },
}
