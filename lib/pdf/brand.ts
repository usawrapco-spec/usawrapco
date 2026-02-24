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

export const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export const PDF_TERMS = [
  '50% deposit required to schedule. Remaining balance due upon vehicle pickup.',
  'Deposits are non-refundable after design work has begun.',
  'Customer responsible for vehicle being clean at time of drop-off.',
  'USA Wrap Co is not responsible for pre-existing paint defects or damage.',
  'Vehicle wraps carry a 3-year warranty against peeling and fading under normal use.',
  'Turnaround time is estimated and subject to change based on production schedule.',
  'This estimate is valid for 30 days from the date issued.',
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
