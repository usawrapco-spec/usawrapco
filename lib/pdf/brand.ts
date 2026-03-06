// USA Wrap Co Brand Constants for PDF generation
export const BRAND = {
  name: 'USA Wrap Co',
  tagline: 'American Craftsmanship You Can Trust™',
  address: '4124 124th St. NW',
  city: 'Gig Harbor, WA 98332',
  phone: '253-525-8148',
  email: 'sales@usawrapco.com',
  website: 'usawrapco.com',
  instagram: '@usawrapco',
  facebook: 'facebook.com/USAWRAPCO',
  logoUrl: 'https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp',
} as const

export const PDF_COLORS = {
  dark: '#0f172a',
  darkAlt: '#1e293b',
  accent: '#3b82f6',
  accentDark: '#2563eb',
  green: '#22c55e',
  greenDark: '#16a34a',
  amber: '#f59e0b',
  amberDark: '#d97706',
  red: '#ef4444',
  purple: '#8b5cf6',
  white: '#ffffff',
  lightGray: '#f8fafc',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
} as const

// Vehicle Wrap T&C — USA Wrap Co (Washington State)
export const PDF_TERMS = [
  '50% deposit required to schedule. Remaining balance due at vehicle pickup. Card on file will be charged if unpaid within 10 days of completion.',
  'Deposits are non-refundable after design work has begun. Cancellations within 24 hours of drop-off subject to a $250 fee.',
  'Vehicle must be clean and dry at drop-off. Waxes, tire shine, and gloss enhancers must not be applied before appointment. $100 cleaning fee if excessively dirty.',
  'USA Wrap Co is not responsible for pre-existing paint defects, failing clear coat, or damage revealed during or after installation.',
  'A vinyl wrap is not paint. Seams (~1"), minor exposed areas near door handles, mirrors, and tight curves are normal and expected.',
  'Vehicle wraps carry a 3-year limited warranty against peeling, lifting, and fading under normal use and proper care. Excludes pressure washing, abrasive chemicals, and automatic car washes.',
  'All logos must be provided in vector format (.AI/.EPS/.SVG). A $150 re-vectoring fee applies otherwise. Client is responsible for all spelling and color accuracy before print approval.',
  'Once design is approved for print, no changes can be made. Changes after approval subject to additional fees and potential reprint costs.',
  'Removals are billed separately at $100/hour. USA Wrap Co is not responsible for paint or clear coat damage during removal.',
  'This estimate is valid for 30 days. Governing law: State of Washington. Disputes resolved by binding arbitration in Pierce County, WA.',
] as const

// Boat Decking T&C — Dekwave / Chance the Wrapper LLC
export const BOAT_PDF_TERMS = [
  'A deposit is required to secure scheduling. Deposits are non-refundable once scanning/design work has begun.',
  'Final balance due within 48 hours of completion. Vessel will not be released until paid in full. Card on file will be charged after 10 days if unpaid.',
  'Vessel must be completely cleared of obstacles before scanning or installation. $500 rescheduling fee if not ready.',
  'Contractor is not responsible for damage to surfaces or fittings during installation. Client waives all related legal claims by signing.',
  '3-year limited warranty on workmanship and material adhesion under proper care. Excludes neglect, harsh chemicals, bird droppings, fuel, pressure washing, and pre-existing gelcoat damage.',
  'Hardware (cleats, rails, lights, fittings) will not be removed. Decking is cut around these items; some original surfaces may remain visible. Edge sealing is permanent.',
  'Surface prep for aluminum or salt-exposed decks billed at $100/hour (1-hour minimum). No adhesion warranty after saltwater exposure.',
  'Marine environments are irregular. Seams, gaps, and original surface exposure near hardware are normal. Adhesion and durability are guaranteed — cosmetic perfection is not.',
  'Removals billed at $100/hour (1-hour minimum). Contractor is not responsible for damage to gelcoat or underlying surfaces during removal.',
  'Governing law: State of Washington. Disputes resolved by binding arbitration in Pierce County, WA.',
] as const

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function addDays(dateStr: string | null | undefined, days: number): string {
  if (!dateStr) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  try {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}
