import type { PipeStage } from '@/types'

// ─── Mobile job shape (mirrors mock data) ────────────────────
export interface MobileJob {
  id: string
  title: string
  customer: string
  vehicle: string
  stage: PipeStage
  agent: string
  installer: string
  revenue: number
  cost: number
  gpm: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  daysOpen: number
  installDate: string
  progress: number
  hasWarning?: boolean
  warningMsg?: string
  photoCount: number
}

// ─── Pipeline stages config ──────────────────────────────────
export const STAGES: {
  key: PipeStage
  label: string
  short: string
  color: string
  bg: string
}[] = [
  { key: 'sales_in',    label: 'Sales In',      short: 'SAL', color: '#4f7fff', bg: 'rgba(79,127,255,0.15)' },
  { key: 'production',  label: 'Production',    short: 'PRD', color: '#22c07a', bg: 'rgba(34,192,122,0.15)' },
  { key: 'install',     label: 'Install',       short: 'INS', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { key: 'prod_review', label: 'QC Review',     short: 'QC',  color: '#22d3ee', bg: 'rgba(34,211,238,0.15)' },
  { key: 'sales_close', label: 'Sales Close',   short: 'CLO', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  { key: 'done',        label: 'Done',          short: 'DON', color: '#5a6080', bg: 'rgba(90,96,128,0.15)' },
]

// ─── Role → visible tabs mapping ─────────────────────────────
export type DemoRole = 'owner' | 'admin' | 'sales_agent' | 'designer' | 'production' | 'installer' | 'qc'

export const ROLE_TABS: Record<DemoRole, string[]> = {
  owner:       ['overview', 'chat', 'sales', 'production', 'install', 'qc', 'close', 'photos', 'timer', 'expenses', 'activity'],
  admin:       ['overview', 'chat', 'sales', 'production', 'install', 'qc', 'close', 'photos', 'timer', 'expenses', 'activity'],
  sales_agent: ['overview', 'chat', 'sales', 'close', 'photos'],
  designer:    ['overview', 'chat', 'production', 'photos'],
  production:  ['overview', 'chat', 'production', 'qc', 'photos', 'timer'],
  installer:   ['overview', 'chat', 'install', 'photos', 'timer'],
  qc:          ['overview', 'chat', 'qc', 'photos'],
}

export const ALL_TABS: { key: string; label: string }[] = [
  { key: 'overview',   label: 'Overview' },
  { key: 'chat',       label: 'Chat' },
  { key: 'sales',      label: 'Sales' },
  { key: 'production', label: 'Production' },
  { key: 'install',    label: 'Install' },
  { key: 'qc',         label: 'QC' },
  { key: 'close',      label: 'Close' },
  { key: 'photos',     label: 'Photos' },
  { key: 'timer',      label: 'Timer' },
  { key: 'expenses',   label: 'Expenses' },
  { key: 'activity',   label: 'Activity' },
]

// ─── Sample jobs ─────────────────────────────────────────────
export const JOBS_MOCK: MobileJob[] = [
  {
    id: 'j1', title: 'Fleet Wrap — 12 Vans', customer: 'Puget Sound Plumbing',
    vehicle: '2024 Ford Transit', stage: 'production', agent: 'Marcus W.',
    installer: 'Tony R.', revenue: 28500, cost: 12400, gpm: 56.5,
    priority: 'high', daysOpen: 14, installDate: '2026-03-08',
    progress: 65, hasWarning: true, warningMsg: 'Material on back-order',
    photoCount: 24,
  },
  {
    id: 'j2', title: 'Color Change — Satin Black', customer: 'Jake Morrison',
    vehicle: '2023 BMW M4', stage: 'install', agent: 'Sarah K.',
    installer: 'Mike D.', revenue: 6200, cost: 1800, gpm: 71.0,
    priority: 'normal', daysOpen: 7, installDate: '2026-03-03',
    progress: 80, photoCount: 12,
  },
  {
    id: 'j3', title: 'Partial Wrap + PPF', customer: 'Emerald City Brewing',
    vehicle: '2025 Rivian R1T', stage: 'sales_in', agent: 'Marcus W.',
    installer: '', revenue: 9800, cost: 3200, gpm: 67.3,
    priority: 'normal', daysOpen: 3, installDate: '2026-03-15',
    progress: 15, photoCount: 4,
  },
  {
    id: 'j4', title: 'Chrome Delete + Tint', customer: 'Lisa Chen',
    vehicle: '2024 Tesla Model Y', stage: 'prod_review', agent: 'Sarah K.',
    installer: 'Tony R.', revenue: 3400, cost: 900, gpm: 73.5,
    priority: 'low', daysOpen: 5, installDate: '2026-03-01',
    progress: 90, photoCount: 18,
  },
  {
    id: 'j5', title: 'Racing Livery', customer: 'NW Motorsports',
    vehicle: '2023 Porsche 911 GT3', stage: 'sales_close', agent: 'Marcus W.',
    installer: 'Mike D.', revenue: 12000, cost: 4100, gpm: 65.8,
    priority: 'high', daysOpen: 21, installDate: '2026-02-20',
    progress: 95, photoCount: 32,
  },
  {
    id: 'j6', title: 'Box Truck Branding', customer: 'Sound Movers LLC',
    vehicle: '2022 Isuzu NPR', stage: 'done', agent: 'Sarah K.',
    installer: 'Tony R.', revenue: 4800, cost: 1600, gpm: 66.7,
    priority: 'normal', daysOpen: 30, installDate: '2026-02-10',
    progress: 100, photoCount: 8,
  },
]

// ─── Helpers ─────────────────────────────────────────────────
export function stageFor(key: PipeStage) {
  return STAGES.find(s => s.key === key) ?? STAGES[0]
}

export function gpmColor(gpm: number): string {
  if (gpm >= 70) return 'var(--green)'
  if (gpm >= 55) return 'var(--amber)'
  return 'var(--red)'
}

export function formatK(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n}`
}
