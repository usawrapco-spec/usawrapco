// Shared types for estimate calculators

export interface CalcOutput {
  name?: string
  unit_price: number
  specs: {
    vinylArea?: number
    materialCost?: number
    installerPay?: number
    estimatedHours?: number
    designFee?: number
    vehicleYear?: string
    vehicleMake?: string
    vehicleModel?: string
    vehicleType?: string
    wrapType?: string
    vinylType?: string
    laminate?: string | boolean
    wasteBuffer?: number
    productLineType?: string
    [key: string]: unknown
  }
}

export interface PricingRule {
  id: string
  name: string
  applies_to: string
  conditions: {
    label?: string
    install_hours?: number
    installer_pay?: number
    vehicle_category?: string
    [key: string]: unknown
  }
  value: number
}

// Vinyl materials shared across commercial vehicle, box truck, trailer, marine
export const VINYL_MATERIALS = [
  { key: 'avery_1105',    label: 'Avery MPI 1105',   rate: 2.10 },
  { key: 'avery_1005',    label: 'Avery MPI 1005',   rate: 1.85 },
  { key: '3m_2080',       label: '3M 2080 Series',   rate: 2.50 },
  { key: '3m_ij180',      label: '3M IJ180',         rate: 2.30 },
  { key: 'avery_supreme', label: 'Avery Supreme',    rate: 2.75 },
  { key: 'arlon_slx',     label: 'Arlon SLX',        rate: 2.20 },
  { key: 'hexis',         label: 'Hexis Skintac',    rate: 2.00 },
] as const

export const LAMINATE_RATE = 0.60
export const DESIGN_FEE_DEFAULT = 150
export const GPM_TARGET = 0.73

export function autoPrice(cogs: number): number {
  return cogs > 0 ? cogs / (1 - GPM_TARGET) : 0
}

export function calcGPMPct(salePrice: number, cogs: number): number {
  return salePrice > 0 ? ((salePrice - cogs) / salePrice) * 100 : 0
}

export function gpmColor(gpm: number): string {
  if (gpm >= 73) return 'var(--green)'
  if (gpm >= 65) return 'var(--amber)'
  return 'var(--red)'
}

// Shared style constants
export const calcFieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 4,
  fontFamily: 'Barlow Condensed, sans-serif',
}

export const calcInput: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text1)',
  fontSize: 13,
  outline: 'none',
}

export const calcSelect: React.CSSProperties = {
  ...calcInput,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239299b5' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 28,
}

export const pillBtn = (active: boolean, color = 'var(--accent)'): React.CSSProperties => ({
  padding: '5px 12px',
  borderRadius: 20,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 700,
  fontFamily: 'Barlow Condensed, sans-serif',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  border: active ? `2px solid ${color}` : '1px solid var(--border)',
  background: active ? color + '22' : 'var(--surface)',
  color: active ? color : 'var(--text2)',
  transition: 'all 0.15s',
})

export const outputRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 0',
  fontSize: 12,
  color: 'var(--text2)',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
}

export const outputVal: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text1)',
}
