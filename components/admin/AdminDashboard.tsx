'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Profile } from '@/types'
import {
  Settings,
  Users,
  Shield,
  DollarSign,
  Package,
  TrendingUp,
  Zap,
  AlertTriangle,
  ChevronRight,
  Building2,
  Database,
  CheckCircle2,
  XCircle,
  SkipForward,
  Play,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react'

// ── Migration result types ─────────────────────────────────────────────────────
interface MigrationFileResult {
  file: string
  ok: boolean
  total: number
  executed: number
  skipped: number
  errors: string[]
}

interface MigrationResponse {
  setup_required?: boolean
  message?: string
  instructions?: string[]
  ok?: boolean
  results?: MigrationFileResult[]
  summary?: { files: number; passed: number; failed: number }
  error?: string
}

// ── MigrationsPanel ────────────────────────────────────────────────────────────
function MigrationsPanel() {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle')
  const [response, setResponse] = useState<MigrationResponse | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleFile(file: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(file) ? next.delete(file) : next.add(file)
      return next
    })
  }

  async function runMigrations() {
    setState('running')
    setResponse(null)
    try {
      const res = await fetch('/api/admin/migrate', { method: 'POST' })
      const data: MigrationResponse = await res.json()
      setResponse(data)
      // Auto-expand failed files
      if (data.results) {
        setExpanded(new Set(data.results.filter(r => !r.ok).map(r => r.file)))
      }
    } catch (e: any) {
      setResponse({ error: e.message || 'Network error' })
    } finally {
      setState('done')
    }
  }

  const isSetupRequired = response?.setup_required
  const hasResults = response?.results && response.results.length > 0

  return (
    <div style={{
      marginTop: 32,
      borderRadius: 12,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: hasResults || isSetupRequired ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'rgba(139,92,246,0.12)', padding: 10, borderRadius: 8 }}>
            <Database size={20} style={{ color: 'var(--purple)' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 900, color: 'var(--text1)' }}>
              Database Migrations
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
              Runs all <code style={{ background: 'var(--surface2)', padding: '0 4px', borderRadius: 3, fontSize: 11 }}>/sql/*.sql</code> files against Supabase. Safe to re-run — idempotent.
            </div>
          </div>
        </div>
        <button
          onClick={runMigrations}
          disabled={state === 'running'}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 8, border: 'none', cursor: state === 'running' ? 'not-allowed' : 'pointer',
            background: state === 'running' ? 'var(--surface2)' : 'var(--purple)',
            color: state === 'running' ? 'var(--text3)' : '#fff',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
            opacity: state === 'running' ? 0.7 : 1,
          }}
        >
          {state === 'running'
            ? <><Terminal size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running...</>
            : <><Play size={13} /> Run Migrations</>}
        </button>
      </div>

      {/* Setup required message */}
      {isSetupRequired && (
        <div style={{ padding: '16px 20px' }}>
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>
              <AlertTriangle size={14} /> DATABASE_URL required
            </div>
            <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(response.instructions || []).map((line, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, fontFamily: 'JetBrains Mono, monospace' }}>
                  {line}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Error (non-setup) */}
      {response?.error && !isSetupRequired && (
        <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--red)' }}>
          {response.error}
        </div>
      )}

      {/* Summary bar */}
      {response?.summary && (
        <div style={{
          display: 'flex', gap: 20, padding: '12px 20px',
          background: response.ok ? 'rgba(34,192,122,0.05)' : 'rgba(242,90,90,0.05)',
          borderBottom: hasResults ? '1px solid var(--border)' : 'none',
        }}>
          <Stat label="Files" value={response.summary.files} />
          <Stat label="Passed" value={response.summary.passed} color="var(--green)" />
          {response.summary.failed > 0 && (
            <Stat label="Failed" value={response.summary.failed} color="var(--red)" />
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: response.ok ? 'var(--green)' : 'var(--red)' }}>
            {response.ok
              ? <><CheckCircle2 size={15} /> All migrations applied</>
              : <><XCircle size={15} /> Some files had errors</>}
          </div>
        </div>
      )}

      {/* Per-file results */}
      {hasResults && (
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {response!.results!.map(r => {
            const isOpen = expanded.has(r.file)
            return (
              <div key={r.file} style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => (r.errors.length > 0) && toggleFile(r.file)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 20px', background: 'none', border: 'none',
                    cursor: r.errors.length > 0 ? 'pointer' : 'default', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (r.errors.length > 0) e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  {/* Status icon */}
                  {r.ok
                    ? <CheckCircle2 size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    : <XCircle size={15} style={{ color: 'var(--red)', flexShrink: 0 }} />}

                  {/* Filename */}
                  <span style={{ fontSize: 13, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', flex: 1 }}>
                    {r.file}
                  </span>

                  {/* Stats chips */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {r.executed > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--green)', background: 'rgba(34,192,122,0.1)', padding: '1px 8px', borderRadius: 6, fontWeight: 700 }}>
                        +{r.executed} run
                      </span>
                    )}
                    {r.skipped > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '1px 8px', borderRadius: 6 }}>
                        {r.skipped} skipped
                      </span>
                    )}
                    {r.errors.length > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--red)', background: 'rgba(242,90,90,0.1)', padding: '1px 8px', borderRadius: 6, fontWeight: 700 }}>
                        {r.errors.length} error{r.errors.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {r.errors.length > 0 && (
                    isOpen ? <ChevronUp size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  )}
                </button>

                {/* Error details */}
                {isOpen && r.errors.length > 0 && (
                  <div style={{ padding: '0 20px 12px 45px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {r.errors.map((e, i) => (
                      <div key={i} style={{
                        fontSize: 11, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace',
                        background: 'rgba(242,90,90,0.07)', padding: '6px 10px', borderRadius: 6,
                        lineHeight: 1.5, wordBreak: 'break-all',
                      }}>
                        {e}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 800, color: color || 'var(--text1)' }}>{value}</span>
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
    </div>
  )
}

interface AdminDashboardProps {
  profile: Profile
}

export default function AdminDashboard({ profile }: AdminDashboardProps) {
  const menuItems = [
    {
      title: 'Organization Settings',
      description: 'Business info, logo, tax rate, timezone',
      icon: Building2,
      href: '/admin/org',
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      title: 'User Management',
      description: 'Manage users, roles, permissions, invites',
      icon: Users,
      href: '/admin/users',
      color: 'text-cyan',
      bg: 'bg-cyan/10',
    },
    {
      title: 'Permissions Editor',
      description: 'Visual permission matrix for all roles',
      icon: Shield,
      href: '/admin/permissions',
      color: 'text-purple',
      bg: 'bg-purple/10',
    },
    {
      title: 'Commission Rules',
      description: 'Configure commission rates, bonuses, tiers',
      icon: DollarSign,
      href: '/admin/commissions',
      color: 'text-green',
      bg: 'bg-green/10',
    },
    {
      title: 'Material Pricing',
      description: 'Wrap and decking material costs',
      icon: Package,
      href: '/admin/materials',
      color: 'text-amber',
      bg: 'bg-amber/10',
    },
    {
      title: 'Overhead Settings',
      description: 'Monthly overhead line items and burn rate',
      icon: TrendingUp,
      href: '/admin/overhead',
      color: 'text-cyan',
      bg: 'bg-cyan/10',
    },
    {
      title: 'Integrations',
      description: 'QuickBooks, Twilio, Stripe, API keys',
      icon: Zap,
      href: '/admin/integrations',
      color: 'text-purple',
      bg: 'bg-purple/10',
    },
    {
      title: 'Danger Zone',
      description: 'Export data, reset settings, destructive actions',
      icon: AlertTriangle,
      href: '/admin/danger',
      color: 'text-red',
      bg: 'bg-red/10',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-900 text-text1 mb-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Admin Control Center
        </h1>
        <p className="text-sm text-text3">
          Organization-wide settings and controls. Only accessible to the owner.
        </p>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-4 p-5 rounded-xl border border-border bg-surface hover:border-accent/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className={`${item.bg} p-3 rounded-lg shrink-0`}>
                <Icon size={24} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-700 text-text1 group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>
                  <ChevronRight size={16} className="text-text3 group-hover:text-accent transition-colors" />
                </div>
                <p className="text-sm text-text3">
                  {item.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Migrations Panel */}
      <MigrationsPanel />

      {/* Footer Note */}
      <div className="mt-8 p-4 rounded-lg bg-amber/5 border border-amber/20">
        <p className="text-xs text-text3">
          <strong className="text-amber">Admin Access:</strong> These settings affect the entire organization.
          Changes here apply to all users and all data. Proceed with caution.
        </p>
      </div>
    </div>
  )
}
