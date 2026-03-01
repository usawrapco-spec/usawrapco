'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, X, ChevronRight, AlertTriangle,
  CheckCircle, Sparkles, FileText, Briefcase, Archive,
  Eye, Car, Globe, GitBranch, FileInput,
} from 'lucide-react'
import type { Profile } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DesignIntake {
  id: string
  customer_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  referral_source: string | null
  services_requested: string[] | null
  vehicle_details: Record<string, unknown> | null
  brand_assets: Record<string, unknown> | null
  ai_conversation: Array<{ role: string; content: string }> | null
  vision_notes: string | null
  status: string
  converted_customer_id: string | null
  converted_project_id: string | null
  created_at: string
}

type Filter = 'all' | 'new' | 'this_week' | 'unactioned' | 'converted'

// ── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  new:              { label: 'New',             bg: 'rgba(79,127,255,0.15)',   color: '#4f7fff' },
  reviewing:        { label: 'Reviewing',       bg: 'rgba(245,158,11,0.15)',   color: '#f59e0b' },
  brief_created:    { label: 'Brief Created',   bg: 'rgba(139,92,246,0.15)',   color: '#8b5cf6' },
  mockup_generated: { label: 'Mockup Generated', bg: 'rgba(34,163,238,0.15)', color: '#22d3ee' },
  converted:        { label: 'Converted',       bg: 'rgba(34,192,122,0.15)',   color: '#22c07a' },
}

const SERVICE_ICONS: Record<string, string> = {
  vehicle_wrap: 'V', commercial_fleet: 'F', trailer_wrap: 'T',
  marine_boat: 'B', storefront: 'S', logo_design: 'L',
  brand_package: 'P', social_media: 'M',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isStale(intake: DesignIntake) {
  if (intake.status !== 'new') return false
  const created = new Date(intake.created_at)
  return Date.now() - created.getTime() > 24 * 60 * 60 * 1000
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type TopTab = 'intakes' | 'referrals'

type TabItem = { key: TopTab; label: string; icon: React.ElementType }

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DesignIntakesClient({ profile, referrals = [] }: { profile: Profile; referrals?: any[] }) {
  const router = useRouter()
  const [topTab, setTopTab] = useState<TopTab>('intakes')
  const [intakes, setIntakes] = useState<DesignIntake[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<DesignIntake | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const isAdmin = ['owner', 'admin'].includes(profile.role)

  const fetchIntakes = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filter === 'converted') params.set('status', 'converted')
    if (filter === 'unactioned') params.set('status', 'new')

    const res = await fetch(`/api/design-intakes?${params}`)
    if (res.ok) {
      let data: DesignIntake[] = await res.json()
      if (filter === 'this_week') {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        data = data.filter(d => new Date(d.created_at).getTime() > weekAgo)
      }
      setIntakes(data)
    }
    setLoading(false)
  }, [filter, search])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => fetchIntakes(), 300)
    return () => clearTimeout(t)
  }, [fetchIntakes])

  const newCount = intakes.filter(i => i.status === 'new').length

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/design-intakes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchIntakes()
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev)
  }

  const doAction = async (action: string) => {
    if (!selected) return
    setActionLoading(action)
    try {
      if (action === 'mark_reviewed') {
        await updateStatus(selected.id, 'reviewing')
      } else if (action === 'archive') {
        await updateStatus(selected.id, 'archived')
        setSelected(null)
      } else if (action === 'convert_to_job') {
        const res = await fetch(`/api/design-intakes/${selected.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'convert_to_job' }),
        })
        const data = await res.json()
        if (data.projectId) {
          router.push(`/projects/${data.projectId}`)
        }
      } else if (action === 'create_brief') {
        const res = await fetch(`/api/design-intakes/${selected.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_brief' }),
        })
        const data = await res.json()
        if (data.briefId) {
          router.push(`/design/briefs`)
        }
        fetchIntakes()
      } else if (action === 'generate_mockup') {
        router.push(
          `/mockup?intake_id=${selected.id}&name=${encodeURIComponent(selected.customer_name || '')}`
        )
      }
    } finally {
      setActionLoading(null)
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'this_week', label: 'This Week' },
    { key: 'unactioned', label: 'Unactioned' },
    { key: 'converted', label: 'Converted' },
  ]

  const tabList: TabItem[] = [
    { key: 'intakes', label: 'Design Intakes', icon: FileInput },
    ...(isAdmin ? [{ key: 'referrals' as TopTab, label: 'Referrals', icon: GitBranch }] : []),
  ]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
      {/* ── Top Tab Bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '16px 28px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        {tabList.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTopTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: topTab === t.key ? 'var(--surface2)' : 'transparent',
                borderBottom: topTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                color: topTab === t.key ? 'var(--text1)' : 'var(--text3)',
                fontSize: 13, fontWeight: topTab === t.key ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              <Icon size={14} /> {t.label}
              {t.key === 'referrals' && referrals.length > 0 && (
                <span style={{ padding: '0 6px', borderRadius: 10, fontSize: 10, background: 'var(--surface)', color: 'var(--text3)' }}>
                  {referrals.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Referrals Tab ───────────────────────────────────────────────────── */}
      {topTab === 'referrals' && isAdmin && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {referrals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>No referrals found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Code', 'Status', 'Commission', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map((r: Record<string, unknown>) => (
                  <tr key={String(r.id)} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text1)', fontFamily: 'monospace' }}>{String(r.referral_code || '—')}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text2)' }}>{String(r.status || '—')}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--green)' }}>{r.commission_amount ? `$${Number(r.commission_amount).toFixed(2)}` : '—'}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: 'var(--text3)' }}>{r.created_at ? new Date(String(r.created_at)).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Intakes Tab ─────────────────────────────────────────────────────── */}
      {topTab === 'intakes' && (
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* ── Main Panel ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', margin: 0 }}>
                  Design Intakes
                </h1>
                {newCount > 0 && (
                  <div style={{
                    background: '#f25a5a', color: '#fff', borderRadius: 20,
                    padding: '2px 9px', fontSize: 12, fontWeight: 700,
                  }}>{newCount}</div>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
                Submitted project briefs from the public onboarding wizard
              </div>
            </div>
          </div>

          {/* Filter + Search */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 10, padding: 4 }}>
              {filters.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{
                    padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500,
                    background: filter === f.key ? 'var(--accent)' : 'transparent',
                    color: filter === f.key ? '#fff' : 'var(--text2)',
                    transition: 'all 0.15s',
                  }}>{f.label}</button>
              ))}
            </div>

            <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
              <Search size={14} color="var(--text3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, business, email..."
                style={{
                  width: '100%', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 9, padding: '8px 12px 8px 34px', fontSize: 13, color: 'var(--text1)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={14} color="var(--text3)" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text3)' }}>Loading intakes...</div>
          ) : intakes.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: 'var(--text2)', marginBottom: 8 }}>No intakes found</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Intakes from the public onboarding wizard will appear here.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr>
                  {['Customer', 'Business', 'Services', 'Vehicle', 'Submitted', 'Status', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 12px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {intakes.map(intake => {
                  const stale = isStale(intake)
                  const isSelected = selected?.id === intake.id
                  const vd = intake.vehicle_details as Record<string, unknown> | null

                  return (
                    <tr
                      key={intake.id}
                      onClick={() => setSelected(isSelected ? null : intake)}
                      style={{
                        cursor: 'pointer', transition: 'background 0.15s',
                        background: isSelected ? 'rgba(79,127,255,0.08)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {stale && (
                            <div title="Needs attention — over 24 hours old">
                              <AlertTriangle size={14} color="#f59e0b" />
                            </div>
                          )}
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>
                            {intake.customer_name || '—'}
                          </div>
                        </div>
                        {intake.email && (
                          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{intake.email}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: 14, color: 'var(--text2)' }}>
                        {intake.business_name || '—'}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(intake.services_requested || []).slice(0, 3).map(svc => (
                            <span key={svc} title={svc.replace(/_/g, ' ')} style={{ fontSize: 18 }}>
                              {SERVICE_ICONS[svc] || '•'}
                            </span>
                          ))}
                          {(intake.services_requested || []).length > 3 && (
                            <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>
                              +{(intake.services_requested || []).length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: 13, color: 'var(--text2)' }}>
                        {vd ? `${vd.year || ''} ${vd.make || ''} ${vd.model || ''}`.trim() || 'Yes' : '—'}
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: 13, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        <div>{fmtDate(intake.created_at)}</div>
                        {stale && (
                          <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>Needs attention</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <StatusPill status={intake.status} />
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <ChevronRight size={16} color="var(--text3)" style={{
                          transform: isSelected ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.2s',
                        }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </div>
    )}

    {/* ── Detail Slide-Over ───────────────────────────────────────────────── */}
    {selected && (
      <IntakeDetail
        intake={selected}
        onClose={() => setSelected(null)}
        onStatusChange={(s) => updateStatus(selected.id, s)}
        onAction={doAction}
        actionLoading={actionLoading}
      />
    )}
  </div>
  )
}

// ── Status Pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: 'rgba(255,255,255,0.08)', color: 'var(--text2)' }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>{cfg.label}</span>
  )
}

// ── Intake Detail Slide-Over ──────────────────────────────────────────────────

function IntakeDetail({
  intake, onClose, onStatusChange, onAction, actionLoading,
}: {
  intake: DesignIntake
  onClose: () => void
  onStatusChange: (s: string) => void
  onAction: (a: string) => void
  actionLoading: string | null
}) {
  const vd = intake.vehicle_details as Record<string, string | boolean | number> | null
  const ba = intake.brand_assets as Record<string, any> | null
  const convo = intake.ai_conversation || []
  const stale = isStale(intake)

  return (
    <div style={{
      width: 520, maxWidth: '90vw', borderLeft: '1px solid rgba(255,255,255,0.07)',
      background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      height: '100%', overflowY: 'auto',
      animation: 'slideIn 0.25s ease',
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', margin: 0 }}>
                {intake.customer_name || 'Unnamed'}
              </h2>
              <StatusPill status={intake.status} />
            </div>
            {intake.business_name && (
              <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>{intake.business_name}</div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              Submitted {fmtDate(intake.created_at)}
              {stale && <span style={{ color: '#f59e0b', marginLeft: 8 }}>— Needs attention</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={intake.status}
              onChange={e => onStatusChange(e.target.value)}
              style={{
                background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text1)',
                cursor: 'pointer', outline: 'none',
              }}
            >
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={18} color="var(--text2)" />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Contact */}
        <Section title="Contact Info" icon={<Globe size={14} />}>
          <DetailRow label="Name"   value={intake.customer_name} />
          <DetailRow label="Email"  value={intake.email} />
          <DetailRow label="Phone"  value={intake.phone} />
          <DetailRow label="Website" value={intake.website} />
          <DetailRow label="Heard via" value={intake.referral_source} />
        </Section>

        {/* Services */}
        <Section title="Services Requested" icon={<Sparkles size={14} />}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {(intake.services_requested || []).map(svc => (
              <span key={svc} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(79,127,255,0.12)', color: '#4f7fff',
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              }}>
                <span>{SERVICE_ICONS[svc] || ''}</span>
                {svc.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            ))}
          </div>
        </Section>

        {/* Vehicle */}
        {vd && (
          <Section title="Vehicle Details" icon={<Car size={14} />}>
            {vd.year && <DetailRow label="Year" value={String(vd.year)} />}
            {vd.make && <DetailRow label="Make" value={String(vd.make)} />}
            {vd.model && <DetailRow label="Model" value={String(vd.model)} />}
            {vd.quantity && <DetailRow label="Quantity" value={String(vd.quantity)} />}
            {vd.color && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Color</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: String(vd.color), border: '1px solid rgba(255,255,255,0.15)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text1)', fontFamily: 'monospace' }}>{String(vd.color).toUpperCase()}</span>
                </div>
              </div>
            )}
            <DetailRow label="Existing Wrap" value={vd.hasExistingWrap ? 'Yes, needs removal' : 'No'} />
            {vd.boatType && <DetailRow label="Boat Type" value={String(vd.boatType)} />}
            {vd.boatLength && <DetailRow label="Length" value={`${vd.boatLength} ft`} />}
            {(vd.photoCount as number) > 0 && <DetailRow label="Photos" value={`${vd.photoCount} uploaded`} />}
          </Section>
        )}

        {/* Brand */}
        {ba && (
          <Section title="Brand Assets" icon={<FileText size={14} />}>
            <DetailRow label="Has Logo" value={String(ba.hasLogo || '—')} />
            {!!ba.brandWords && <DetailRow label="Brand Words" value={String(ba.brandWords)} />}
            {!!ba.industry && <DetailRow label="Industry" value={String(ba.industry)} />}
            {!!ba.inspirationLink && <DetailRow label="Inspo Link" value={String(ba.inspirationLink)} />}
            {(ba.inspirationCount as number) > 0 && (
              <DetailRow label="Inspo Images" value={`${ba.inspirationCount} uploaded`} />
            )}
            {Array.isArray(ba.colors) && ba.colors.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Colors</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(ba.colors as string[]).map((c, i) => (
                    <div key={i} title={c} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.15)' }} />
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* AI Conversation */}
        {convo.length > 0 && (
          <Section title="AI Conversation" icon={<Sparkles size={14} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {convo.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                    background: msg.role === 'user' ? 'rgba(79,127,255,0.2)' : 'var(--surface2)',
                    fontSize: 13, color: 'var(--text1)', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content.replace('BRIEF_COMPLETE', '').trim()}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Vision Notes */}
        {intake.vision_notes && (
          <Section title="Vision Notes" icon={<Eye size={14} />}>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, margin: 0, marginTop: 4 }}>
              {intake.vision_notes}
            </p>
          </Section>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{
        padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <ActionBtn
            icon={<Sparkles size={14} />} label="Generate Mockup"
            onClick={() => onAction('generate_mockup')}
            loading={actionLoading === 'generate_mockup'}
            color="#22d3ee"
          />
          <ActionBtn
            icon={<FileText size={14} />} label="Create Brief"
            onClick={() => onAction('create_brief')}
            loading={actionLoading === 'create_brief'}
            color="#8b5cf6"
          />
          <ActionBtn
            icon={<Briefcase size={14} />} label="Convert to Job"
            onClick={() => onAction('convert_to_job')}
            loading={actionLoading === 'convert_to_job'}
            color="#22c07a"
          />
          <ActionBtn
            icon={<CheckCircle size={14} />} label="Mark Reviewed"
            onClick={() => onAction('mark_reviewed')}
            loading={actionLoading === 'mark_reviewed'}
            color="#f59e0b"
          />
        </div>
        <button
          onClick={() => onAction('archive')}
          disabled={actionLoading === 'archive'}
          style={{
            width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 9, padding: '9px', fontSize: 13, color: 'var(--text3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Archive size={13} /> Archive
        </button>
      </div>
    </div>
  )
}

// ── Mini Components ───────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ color: 'var(--text3)' }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 13, color: 'var(--text3)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text1)', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, loading, color }: {
  icon: React.ReactNode; label: string; onClick: () => void
  loading: boolean; color: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: `${color}18`, border: `1px solid ${color}40`,
        borderRadius: 9, padding: '10px 12px', fontSize: 13, fontWeight: 600,
        color: color, cursor: loading ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
      }}
    >
      {icon} {loading ? '...' : label}
    </button>
  )
}
