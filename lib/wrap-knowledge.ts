/**
 * lib/wrap-knowledge.ts
 * Comprehensive wrap industry knowledge base for USA WRAP CO.
 */

export const VEHICLE_DIMENSIONS: Record<string, { sqft: number, fullWrap: number, partial: number, roof: number, hood: number }> = {
  'sedan_small': { sqft: 180, fullWrap: 180, partial: 120, roof: 25, hood: 18 },
  'sedan_mid': { sqft: 200, fullWrap: 200, partial: 140, roof: 28, hood: 20 },
  'sedan_large': { sqft: 220, fullWrap: 220, partial: 155, roof: 30, hood: 22 },
  'coupe': { sqft: 170, fullWrap: 170, partial: 110, roof: 22, hood: 18 },
  'suv_compact': { sqft: 230, fullWrap: 230, partial: 160, roof: 35, hood: 22 },
  'suv_mid': { sqft: 270, fullWrap: 270, partial: 190, roof: 40, hood: 24 },
  'suv_full': { sqft: 310, fullWrap: 310, partial: 220, roof: 45, hood: 26 },
  'truck_single_cab': { sqft: 220, fullWrap: 220, partial: 150, roof: 28, hood: 22 },
  'truck_double_cab': { sqft: 280, fullWrap: 280, partial: 195, roof: 32, hood: 24 },
  'van_cargo': { sqft: 320, fullWrap: 320, partial: 220, roof: 50, hood: 22 },
  'van_sprinter': { sqft: 400, fullWrap: 400, partial: 280, roof: 65, hood: 22 },
  'box_truck_12ft': { sqft: 350, fullWrap: 350, partial: 240, roof: 48, hood: 20 },
  'box_truck_16ft': { sqft: 450, fullWrap: 450, partial: 310, roof: 64, hood: 20 },
  'box_truck_24ft': { sqft: 580, fullWrap: 580, partial: 400, roof: 96, hood: 20 },
  'trailer_enclosed': { sqft: 300, fullWrap: 300, partial: 200, roof: 0, hood: 0 },
  'sports_car': { sqft: 165, fullWrap: 165, partial: 105, roof: 20, hood: 18 },
}

export const FLAT_RATES: Record<string, number> = {
  'truck_single_cab': 600,
  'truck_double_cab': 900,
}

export const MATERIAL_TYPES = {
  cast_vinyl: [
    { name: '3M 1080', brand: '3M', type: 'cast', durability: '7 years', price_sqft: 3.50, colors: 90 },
    { name: '3M 2080', brand: '3M', type: 'cast', durability: '7 years', price_sqft: 4.00, colors: 60 },
    { name: 'Avery Dennison SW900', brand: 'Avery', type: 'cast', durability: '7 years', price_sqft: 3.75, colors: 80 },
    { name: 'KPMF K75000', brand: 'KPMF', type: 'cast', durability: '5 years', price_sqft: 3.25, colors: 50 },
    { name: 'Inozetek', brand: 'Inozetek', type: 'cast', durability: '5 years', price_sqft: 5.00, colors: 40 },
    { name: 'Hexis HX30000', brand: 'Hexis', type: 'cast', durability: '7 years', price_sqft: 3.50, colors: 60 },
  ],
  calendered_vinyl: [
    { name: 'Oracal 651', brand: 'Oracal', type: 'calendered', durability: '3 years', price_sqft: 1.50, use: 'decals/lettering' },
    { name: 'Oracal 751', brand: 'Oracal', type: 'calendered', durability: '5 years', price_sqft: 2.00, use: 'commercial graphics' },
  ],
  laminates: [
    { name: '3M 8518', type: 'gloss', durability: '5 years', price_sqft: 1.50 },
    { name: '3M 8520', type: 'matte', durability: '5 years', price_sqft: 1.50 },
    { name: 'Avery DOL 1060z', type: 'gloss', durability: '7 years', price_sqft: 1.75 },
  ],
  ppf: [
    { name: 'XPEL Ultimate Plus', brand: 'XPEL', durability: '10 years', price_sqft: 8.00, self_healing: true },
    { name: 'SunTek Ultra', brand: 'SunTek', durability: '10 years', price_sqft: 7.00, self_healing: true },
    { name: '3M Pro Series', brand: '3M', durability: '10 years', price_sqft: 7.50, self_healing: true },
  ],
}

export const WRAP_TYPES = [
  { id: 'full_wrap', name: 'Full Wrap', description: 'Complete vehicle coverage', sqft_multiplier: 1.0 },
  { id: 'partial_wrap', name: 'Partial Wrap', description: '50-75% coverage, strategic panels', sqft_multiplier: 0.65 },
  { id: 'color_change', name: 'Color Change', description: 'Full vehicle color transformation', sqft_multiplier: 1.0 },
  { id: 'commercial', name: 'Commercial Wrap', description: 'Business branding and graphics', sqft_multiplier: 0.8 },
  { id: 'decals', name: 'Decals/Lettering', description: 'Cut vinyl graphics and text', sqft_multiplier: 0.2 },
  { id: 'ppf_full', name: 'Full PPF', description: 'Paint protection film, full vehicle', sqft_multiplier: 1.0 },
  { id: 'ppf_partial', name: 'Partial PPF', description: 'PPF on high-impact areas', sqft_multiplier: 0.4 },
  { id: 'chrome_delete', name: 'Chrome Delete', description: 'Cover chrome trim in vinyl', sqft_multiplier: 0.1 },
]

export const PROCESS_TIMELINE = {
  design: { min_days: 3, max_days: 5, description: 'Custom design with 2 revisions included' },
  revision: { min_days: 1, max_days: 2, description: 'Per additional revision round' },
  production: { min_days: 1, max_days: 2, description: 'Printing and laminating' },
  install: { min_days: 1, max_days: 3, description: 'Professional installation' },
  cure: { min_days: 1, max_days: 1, description: 'Post-heat and cure time' },
}

export const CARE_INSTRUCTIONS = [
  'Wait 48-72 hours before washing after installation',
  'Hand wash only — no automatic car washes',
  'Use pH-neutral soap and microfiber mitt',
  'Avoid pressure washing directly at edges',
  'Apply spray wax/sealant every 3 months',
  'Park in shade or garage when possible',
  'Do not use abrasive compounds or clay bars',
  'Address any lifting edges immediately',
]

export const WARRANTY_INFO = {
  installation: '1 year workmanship warranty on all installations',
  materials_3m: '3M MCS Warranty: up to 7 years on cast vinyl',
  materials_avery: 'Avery Supreme Wrapping Film: up to 7 years',
  ppf: 'PPF: up to 10 years against yellowing, cracking, peeling',
  exclusions: ['Pre-existing damage', 'Improper washing', 'Accident damage', 'Normal wear and tear'],
}

export const FAQ = [
  { q: 'How long does a full wrap last?', a: 'A properly installed cast vinyl wrap lasts 5-7 years with proper care. Calendered vinyl lasts 3-5 years.' },
  { q: 'Will a wrap damage my paint?', a: 'No. Quality cast vinyl actually protects your paint. When professionally removed, your original paint is preserved.' },
  { q: 'How long does installation take?', a: 'Most vehicles take 1-3 days depending on complexity. Full color changes and complex designs may take longer.' },
  { q: 'Can I wash my wrapped vehicle?', a: 'Yes! Hand wash with pH-neutral soap. Avoid automatic car washes and pressure washing at edges.' },
  { q: 'What\'s the difference between cast and calendered vinyl?', a: 'Cast vinyl is premium — thinner, more conformable, longer-lasting (5-7 years). Calendered is thicker, less flexible, shorter life (3-5 years), better for flat surfaces.' },
  { q: 'Do you offer financing?', a: 'We accept all major credit cards and can discuss payment plans for fleet orders.' },
  { q: 'What is PPF?', a: 'Paint Protection Film is a clear, self-healing urethane film that protects your paint from rock chips, scratches, and UV damage. Lasts 7-10 years.' },
]

// Helper to get vehicle sqft by category
export function getVehicleSqft(category: string, wrapType: string): number {
  const dims = VEHICLE_DIMENSIONS[category]
  if (!dims) return 200 // default
  const wrap = WRAP_TYPES.find(w => w.id === wrapType)
  return Math.round(dims.fullWrap * (wrap?.sqft_multiplier ?? 1.0))
}

// Helper to get flat rate if applicable
export function getFlatRate(category: string): number | null {
  return FLAT_RATES[category] ?? null
}

// Helper to calculate material cost
export function calcMaterialCost(sqft: number, materialName: string): number {
  const allMaterials = [...MATERIAL_TYPES.cast_vinyl, ...MATERIAL_TYPES.calendered_vinyl, ...MATERIAL_TYPES.ppf]
  const mat = allMaterials.find(m => m.name === materialName)
  const laminates = MATERIAL_TYPES.laminates
  const lamCost = laminates[0]?.price_sqft ?? 1.50
  const matCost = (mat as any)?.price_sqft ?? 3.50
  return Math.round((matCost + lamCost) * sqft * 100) / 100
}
