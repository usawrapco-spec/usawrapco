import {
  Clock, FileText, Printer, Wrench, ShieldCheck, CheckCheck, CheckCircle2,
} from 'lucide-react'

// ─── Portal color constants (shared dark theme) ──────────────────────────────
export const C = {
  bg: '#0d0f14',
  surface: '#13151c',
  surface2: '#1a1d27',
  border: '#2a2f3d',
  accent: '#4f7fff',
  green: '#22c07a',
  red: '#f25a5a',
  cyan: '#22d3ee',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  text1: '#e8eaed',
  text2: '#9299b5',
  text3: '#5a6080',
} as const

// ─── Stage config ────────────────────────────────────────────────────────────
export const STAGE_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  sales_in:    { label: 'Quote Review',  color: C.accent,  icon: FileText },
  production:  { label: 'In Production', color: C.purple,  icon: Printer },
  install:     { label: 'Installing',    color: C.cyan,    icon: Wrench },
  prod_review: { label: 'Quality Check', color: C.amber,   icon: ShieldCheck },
  sales_close: { label: 'Wrapping Up',   color: C.amber,   icon: CheckCheck },
  done:        { label: 'Complete',      color: C.green,   icon: CheckCircle2 },
}

// ─── Customer-facing stage progression ───────────────────────────────────────
export const PORTAL_STAGES = [
  { key: 'estimate',  label: 'Estimate',     pipeStages: ['sales_in'] },
  { key: 'approved',  label: 'Approved',     pipeStages: [] },
  { key: 'design',    label: 'Design',       pipeStages: ['production'] },
  { key: 'proof',     label: 'Proof Review', pipeStages: ['production'] },
  { key: 'print',     label: 'Print',        pipeStages: ['production'] },
  { key: 'install',   label: 'Install',      pipeStages: ['install', 'prod_review'] },
  { key: 'complete',  label: 'Complete',     pipeStages: ['sales_close', 'done'] },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function getPortalStageIndex(pipeStage: string): number {
  const stageMap: Record<string, number> = {
    sales_in: 0, production: 3, install: 5, prod_review: 5, sales_close: 6, done: 6,
  }
  return stageMap[pipeStage] ?? 0
}

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function stageProgress(pipeStage: string): number {
  const idx = getPortalStageIndex(pipeStage)
  return Math.round(((idx + 1) / PORTAL_STAGES.length) * 100)
}
