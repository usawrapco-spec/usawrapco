// Vehicle size categories for pricing
// compact: small sedans, coupes
// mid: mid-size sedans, crossovers, SUVs
// full: full-size SUVs, trucks
// van: vans, large commercial vehicles

export type VehicleSize = 'compact' | 'mid' | 'full' | 'van'

// Maps make+model keywords to size. Lowercase matching.
const SIZE_MAP: { pattern: RegExp; size: VehicleSize }[] = [
  // Compact cars
  { pattern: /corolla|camry|prius|yaris|echo|matrix/i, size: 'compact' },
  { pattern: /civic|fit|hr-v|insight|accord/i, size: 'compact' },
  { pattern: /focus|fiesta|mustang coupe|escort/i, size: 'compact' },
  { pattern: /sentra|altima|versa|leaf/i, size: 'compact' },
  { pattern: /jetta|golf|beetle|passat/i, size: 'compact' },
  { pattern: /elantra|sonata|accent|veloster/i, size: 'compact' },
  { pattern: /soul|forte|rio|stinger/i, size: 'compact' },
  { pattern: /mazda3|mazda6|miata|cx-3/i, size: 'compact' },
  { pattern: /3 series|4 series|2 series/i, size: 'compact' },
  { pattern: /a3|a4|tt|q3/i, size: 'compact' },
  { pattern: /model 3|model s/i, size: 'compact' },
  { pattern: /impreza|brz|wrx/i, size: 'compact' },
  { pattern: /300|charger|challenger/i, size: 'compact' },

  // Mid-size
  { pattern: /rav4|highlander|venza|c-hr/i, size: 'mid' },
  { pattern: /cr-v|pilot|passport|ridgeline/i, size: 'mid' },
  { pattern: /rogue|pathfinder|murano|frontier/i, size: 'mid' },
  { pattern: /explorer|edge|escape|bronco sport|maverick/i, size: 'mid' },
  { pattern: /equinox|traverse|blazer|colorado/i, size: 'mid' },
  { pattern: /tucson|santa fe|palisade/i, size: 'mid' },
  { pattern: /telluride|sorento|sportage|carnival/i, size: 'mid' },
  { pattern: /cx-5|cx-9|cx-30/i, size: 'mid' },
  { pattern: /outback|forester|crosstrek|legacy/i, size: 'mid' },
  { pattern: /5 series|x3|x5/i, size: 'mid' },
  { pattern: /q5|q7|a6|a7|a8/i, size: 'mid' },
  { pattern: /model y|model x/i, size: 'mid' },
  { pattern: /c-class|e-class|glc|gla/i, size: 'mid' },
  { pattern: /4runner|sequoia|land cruiser/i, size: 'mid' },
  { pattern: /wrangler|grand cherokee|gladiator/i, size: 'mid' },
  { pattern: /tacoma|tundra/i, size: 'mid' },
  { pattern: /rx|nx|gx|ux/i, size: 'mid' },

  // Full size trucks & SUVs
  { pattern: /f-150|f150|f-250|f-350|super duty|bronco/i, size: 'full' },
  { pattern: /silverado|sierra|suburban|tahoe|yukon/i, size: 'full' },
  { pattern: /ram 1500|ram 2500|ram 3500|1500|2500|3500/i, size: 'full' },
  { pattern: /navigator|expedition/i, size: 'full' },
  { pattern: /escalade/i, size: 'full' },
  { pattern: /armada|titan/i, size: 'full' },
  { pattern: /defender|discovery/i, size: 'full' },
  { pattern: /range rover/i, size: 'full' },
  { pattern: /suburban|avalanche/i, size: 'full' },
  { pattern: /cybertruck/i, size: 'full' },
  { pattern: /r1t|r1s/i, size: 'full' },

  // Vans
  { pattern: /transit|e-series|e-350|econoline/i, size: 'van' },
  { pattern: /sprinter|metris/i, size: 'van' },
  { pattern: /promaster|ram promaster/i, size: 'van' },
  { pattern: /nv|nissan nv/i, size: 'van' },
  { pattern: /express|savana/i, size: 'van' },
  { pattern: /odyssey|sienna|pacifica|voyager/i, size: 'van' },
  { pattern: /carnival minivan|sedona/i, size: 'van' },
]

export function getVehicleSize(make: string, model: string): VehicleSize {
  const combined = `${make} ${model}`.toLowerCase()
  for (const { pattern, size } of SIZE_MAP) {
    if (pattern.test(combined)) return size
  }
  // Default by make
  const makeLC = make.toLowerCase()
  if (['ford','chevrolet','gmc','ram','nissan','toyota'].includes(makeLC)) return 'mid'
  return 'mid'
}

export interface PricingConfig {
  fullWrap: number
  partialWrap: number
  spotGraphics: number
  colorChange: number
  chromeDelete: number
}

export const PRICING_BY_SIZE: Record<VehicleSize, PricingConfig> = {
  compact: {
    fullWrap: 2800,
    partialWrap: 1600,
    spotGraphics: 800,
    colorChange: 2600,
    chromeDelete: 625,
  },
  mid: {
    fullWrap: 3200,
    partialWrap: 1800,
    spotGraphics: 900,
    colorChange: 3000,
    chromeDelete: 625,
  },
  full: {
    fullWrap: 3800,
    partialWrap: 2200,
    spotGraphics: 1100,
    colorChange: 3500,
    chromeDelete: 625,
  },
  van: {
    fullWrap: 4500,
    partialWrap: 2800,
    spotGraphics: 1400,
    colorChange: 4200,
    chromeDelete: 625,
  },
}

export const ADDON_PRICES: Record<string, number> = {
  roof: 400,
  window_perf: 300,
  door_handles: 150,
  mirrors: 100,
}

export const ADDON_LABELS: Record<string, string> = {
  roof: 'Roof Wrap',
  window_perf: 'Window Perforated Film',
  door_handles: 'Door Handle Wrap',
  mirrors: 'Mirror Wrap',
}

export const SIZE_LABELS: Record<VehicleSize, string> = {
  compact: 'Compact',
  mid: 'Mid-Size',
  full: 'Full-Size',
  van: 'Van / Commercial',
}
