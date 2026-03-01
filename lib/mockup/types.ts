export interface BrandAnalysis {
  brand_personality: string
  color_strategy: string
  graphic_approach: string[]
  text_hierarchy: string
  visual_flow: string
  avoid: string
  industry_context: string
  concepts: ConceptPrompt[]
}

export interface ConceptPrompt {
  name: string
  ideogram_prompt: string
  negative_prompt: string
  style_type: string
  description: string
}

export interface MockupState {
  id?: string
  // Vehicle
  vehicleDbId?: string
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  vehicleBodyStyle: string
  renderCategory: string
  sqftFull: number
  estimatedPrice: number
  // Brand
  businessName: string
  phone: string
  website: string
  tagline: string
  industry: string
  styleVibe: 'clean' | 'bold' | 'luxury' | 'fun'
  feelStatement: string
  brandColors: string[]
  logoUrl?: string
  logoNoBgUrl?: string
  // Generation
  generationStatus: string
  brandAnalysis?: BrandAnalysis
  ideogramPrompts?: ConceptPrompt[]
  conceptImages: string[]
  renderImages: string[][]
  videoUrl?: string
  videoPredictionId?: string
  selectedConcept: number
  // Contact
  email: string
  customerName: string
  // Payment
  paymentStatus: string
  stripeSessionId?: string
}

export const INDUSTRIES = [
  'Plumbing', 'HVAC', 'Electrical', 'Landscaping / Lawn Care',
  'Painting', 'Roofing', 'Construction / General Contractor',
  'Cleaning Services', 'Pest Control', 'Food & Catering',
  'Moving & Storage', 'Towing / Auto', 'Medical / Healthcare',
  'Real Estate', 'Security', 'Delivery / Courier', 'Other',
] as const

export const STYLE_VIBES = [
  { id: 'clean', label: 'Clean & Professional', desc: 'Minimal, corporate, trustworthy' },
  { id: 'bold', label: 'Bold & Aggressive', desc: 'High contrast, big graphics, impossible to miss' },
  { id: 'luxury', label: 'Premium & Luxury', desc: 'Sophisticated, refined, high-end client feel' },
  { id: 'fun', label: 'Fun & Approachable', desc: 'Friendly, creative, memorable personality' },
] as const

export function estimateWrapPrice(sqftFull: number, renderCategory: string): number {
  const baseRates: Record<string, number> = {
    car: 2800, suv: 3400, van: 3800, sprinter: 4200,
    pickup: 3200, box_truck: 5500, trailer: 6500,
  }
  const base = baseRates[renderCategory] || 3000
  const avgSqft: Record<string, number> = {
    car: 200, suv: 240, van: 280, sprinter: 320,
    pickup: 220, box_truck: 400, trailer: 600,
  }
  const avg = avgSqft[renderCategory] || 200
  const sqftMultiplier = sqftFull ? (sqftFull / avg) * 0.3 + 0.7 : 1
  return Math.round((base * sqftMultiplier) / 100) * 100
}
