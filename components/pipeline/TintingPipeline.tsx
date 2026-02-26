'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project } from '@/types'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, X, Car, CheckCircle2, Wrench,
  Calendar, Clock, type LucideIcon,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'

interface TintStage {
  id: string
  label: string
  color: string
  icon: LucideIcon
  description: string
}

const TINTING_STAGES: TintStage[] = [
  { id: 'sales_in',    label: 'Intake',      color: '#4f7fff', icon: Calendar,     description: 'New tint inquiry' },
  { id: 'scheduled',   label: 'Scheduled',   color: '#8b5cf6', icon: Clock,        description: 'Appointment booked' },
  { id: 'install',     label: 'In Progress', color: '#f59e0b', icon: Wrench,       description: 'Tinting in progress' },
  { id: 'prod_review', label: 'QC',          color: '#f25a5a', icon: CheckCircle2, description: 'Quality check' },
  { id: 'sales_close', label: 'Closed',      color: '#22c07a', icon: CheckCircle2, description: 'Job complete & paid' },
]

const FILM_MULTIPLIERS: Record<string, number> = {
  LLumar: 1.0, '3M': 1.1, SunTek: 1.0, XPEL: 1.3, 'Huper Optik': 1.15,
}

const FILM_BRANDS = ['LLumar', '3M', 'SunTek', 'XPEL', 'Huper Optik']
const VLT_OPTIONS = [5, 15, 20, 35, 50]

function calcTintPrice(windowCount: number, sunroof: boolean, windshield: boolean, rearWindow: boolean, filmBrand: string) {
  const base = windowCount * 35
  const extras = (sunroof ? 80 : 0) + (windshield ? 150 : 0) + (rearWindow ? 60 : 0)
  return Math.round((base + extras) * (FILM_MULTIPLIERS[filmBrand] || 1.0))
}

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

function daysSince(iso?: string | null) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

// ─── New Tint Job Modal ───────────────────────────────────────────────────────

function NewTintJobModal({ orgId, userId, onCreated, onClose }: {
  orgId: string; userId: string; onCreated: (p: any) => void; onClose: () => void
}) {
  const supabase = createClient()
  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [vlt, setVlt] = useState(35)
  const [filmBrand, setFilmBrand] = useState('LLumar')
  const [frontDoors, setFrontDoors] = useState(true)
  const [rearDoors, setRearDoors] = useState(true)
  const [rearWindow, setRearWindow] = useState(true)
  const [sunroof, setSunroof] = useState(false)
  const [windshield, setWindshield] = useState(false)
  const [quarterPanels, setQuarterPanels] = useState(false)
  const [saving, setSaving] = useState(false)

  const windowCount = (frontDoors ? 2 : 0) + (rearDoors ? 2 : 0) + (quarterPanels ? 2 : 0)
  const estPrice = calcTintPrice(windowCount, sunroof, windshield, rearWindow, filmBrand)
  const estHours = Math.max(1, (windowCount * 0.35) + (sunroof ? 0.75 : 0) + (windshield ? 0.75 : 0) + (rearWindow ? 0.5 : 0))

  const handleSubmit = async () => {
    if (!year || !make || !model) return
    setSaving(true)
    try {
      const { data: project } = await supabase.from('projects').insert({
        org_id: orgId,
        title: `${year} ${make} ${model} Tint`,
        vehicle_desc: `${year} ${make} ${model} — Tint ${vlt}% ${filmBrand}`,
        service_division: 'tinting',
        type: 'tinting',
        pipe_stage: 'sales_in',
        revenue: estPrice,
        agent_id: userId,
        form_data: {
          clientName: customerName, clientPhone: customerPhone,
          vehicleYear: year, vehicleMake: make, vehicleModel: model,
          filmBrand, vlt, windowCount,
          windows: { frontDoors, rearDoors, rearWindow, sunroof, windshield, quarterPanels },
          estHours, estPrice,
        },
      }).select().single()
      if (project) {
        await supabase.from('tint_specs').insert({
          project_id: project.id, film_brand: filmBrand, vlt_percentage: vlt,
          windows_count: windowCount, sunroof, windshield, rear_window: rearWindow,
          door_windows_count: (frontDoors ? 2 : 0) + (rearDoors ? 2 : 0),
        })
        onCreated(project)
      }
    } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 12px', color: 'var(--text1)', fontSize: 13, outline: 'none', width: '100%',
  }
  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 4, display: 'block',
  }
  const btnStyle = (active: boolean, color = 'var(--accent)'): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    background: active ? color : 'var(--surface2)',
    border: active ? 'none' : '1px solid var(--border)',
    color: active ? (color === 'var(--accent)' ? '#fff' : '#0a2540') : 'var(--text3)',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', margin: 0 }}>
            New Tint Job
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Vehicle</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <input value={year} onChange={e => setYear(e.target.value)} placeholder="Year" style={inp} />
            <input value={make} onChange={e => setMake(e.target.value)} placeholder="Make" style={inp} />
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="Model" style={inp} />
          </div>
        </div>

        <div style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={lbl}>Customer Name</label>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Smith" style={inp} />
          </div>
          <div>
            <label style={lbl}>Phone</label>
            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(206) 555-1234" style={inp} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>VLT — Visible Light Transmission</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VLT_OPTIONS.map(v => (
              <button key={v} onClick={() => setVlt(v)} style={btnStyle(vlt === v)}>{v}%</button>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
            {vlt <= 5 ? 'Limo — nearly opaque' : vlt <= 20 ? 'Very dark — privacy tint' : vlt <= 35 ? 'Medium — popular choice' : vlt <= 50 ? 'Light — minimal shade' : 'Clear — UV only'}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Film Brand</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILM_BRANDS.map(b => (
              <button key={b} onClick={() => setFilmBrand(b)} style={btnStyle(filmBrand === b)}>
                {b}{FILM_MULTIPLIERS[b] > 1 ? ` (${FILM_MULTIPLIERS[b]}x)` : ''}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Windows</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Windshield', value: windshield, set: setWindshield, price: '+$150' },
              { label: 'Front Doors (2)', value: frontDoors, set: setFrontDoors, price: '+$70' },
              { label: 'Rear Doors (2)', value: rearDoors, set: setRearDoors, price: '+$70' },
              { label: 'Rear Window', value: rearWindow, set: setRearWindow, price: '+$60' },
              { label: 'Quarter Panels', value: quarterPanels, set: setQuarterPanels, price: '+$70' },
              { label: 'Sunroof', value: sunroof, set: setSunroof, price: '+$80' },
            ].map(w => (
              <button key={w.label} onClick={() => w.set(!w.value)} style={{
                padding: '10px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                background: w.value ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                border: `1px solid ${w.value ? 'var(--accent)' : 'var(--border)'}`,
                color: w.value ? 'var(--accent)' : 'var(--text2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                    background: w.value ? 'var(--accent)' : 'transparent',
                    border: `2px solid ${w.value ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {w.value && <div style={{ width: 6, height: 6, borderRadius: 2, background: '#fff' }} />}
                  </div>
                  {w.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, marginLeft: 19 }}>{w.price}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
        }}>
          {[
            { value: fM(estPrice), label: 'Est. Price', color: '#22c07a' },
            { value: `${windowCount} win`, label: 'Windows', color: '#22d3ee' },
            { value: `${estHours.toFixed(1)}h`, label: 'Est. Time', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !year || !make || !model}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer', opacity: (!year || !make || !model) ? 0.5 : 1,
          }}
        >
          {saving ? 'Creating...' : `Create Tint Job — ${fM(estPrice)}`}
        </button>
      </div>
    </div>
  )
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function TintJobCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const formData = (project as any).form_data || {}
  const customer = formData.clientName || (project as any).customer?.name || '—'
  const vlt = formData.vlt
  const filmBrand = formData.filmBrand
  const windowCount = formData.windowCount
  const estHours = formData.estHours
  const days = daysSince(project.updated_at)

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
        borderLeft: '3px solid #22c07a',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#22c07a'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderLeftColor = '#22c07a' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.title || project.vehicle_desc || 'Tint Job'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Car size={10} /> {customer}
          </div>
        </div>
        {(project.revenue ?? 0) > 0 && (
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#22c07a', flexShrink: 0, marginLeft: 8 }}>
            {fM(project.revenue ?? 0)}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {vlt && <span style={{ fontSize: 10, fontWeight: 600, color: '#22d3ee', background: 'rgba(34,211,238,0.1)', padding: '1px 6px', borderRadius: 4 }}>{vlt}% VLT</span>}
        {filmBrand && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4 }}>{filmBrand}</span>}
        {windowCount && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{windowCount} win</span>}
        {estHours && <span style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 2 }}><Clock size={9} />{Number(estHours).toFixed(1)}h</span>}
        {days > 3 && <span style={{ fontSize: 10, color: '#f59e0b', marginLeft: 'auto' }}>{days}d</span>}
      </div>
    </div>
  )
}

function TintStageColumn({ stage, projects, onJobClick }: {
  stage: TintStage; projects: Project[]; onJobClick: (id: string) => void
}) {
  const Icon = stage.icon
  return (
    <div style={{ minWidth: 240, flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        borderTop: `3px solid ${stage.color}`,
      }}>
        <Icon size={14} style={{ color: stage.color }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', flex: 1 }}>{stage.label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, background: `${stage.color}22`, padding: '1px 8px', borderRadius: 12 }}>
          {projects.length}
        </span>
      </div>
      {projects.map(p => <TintJobCard key={p.id} project={p} onClick={() => onJobClick(p.id)} />)}
      {projects.length === 0 && (
        <div style={{ padding: '20px 12px', border: '1px dashed var(--border)', borderRadius: 10, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
          {stage.description}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TintingPipelineClient({ profile, initialProjects, orgId }: {
  profile: Profile; initialProjects: Project[]; orgId: string
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [search, setSearch] = useState('')
  const [newJobOpen, setNewJobOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const ch = supabase.channel('tinting-pipeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `org_id=eq.${orgId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          const p = payload.new as Project
          if ((p as any).service_division === 'tinting') setProjects(prev => [...prev, p])
        } else if (payload.eventType === 'UPDATE') {
          setProjects(prev => prev.map(p => p.id === (payload.new as Project).id ? { ...p, ...payload.new } : p))
        } else if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.filter(p => p.id !== (payload.old as any).id))
        }
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orgId])

  const filtered = useMemo(() => {
    if (!search) return projects
    const q = search.toLowerCase()
    return projects.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      (p as any).customer?.name?.toLowerCase().includes(q) ||
      (p as any).vehicle_desc?.toLowerCase().includes(q)
    )
  }, [projects, search])

  const byStage = useMemo(() => {
    const map: Record<string, Project[]> = {}
    TINTING_STAGES.forEach(s => { map[s.id] = [] })
    filtered.forEach(p => {
      const stage = p.pipe_stage || 'sales_in'
      if (map[stage]) map[stage].push(p)
      else map['sales_in'].push(p)
    })
    return map
  }, [filtered])

  const totalValue = projects.reduce((s, p) => s + (p.revenue || 0), 0)
  const activeJobs = projects.filter(p => p.pipe_stage !== 'sales_close' && p.pipe_stage !== 'done').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px 10px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🕶️</span>
            <h1 style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', margin: 0 }}>
              Tinting Pipeline
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 16, marginLeft: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#22c07a' }}>{activeJobs}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Active</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#22c07a' }}>{fM(totalValue)}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Pipeline Value</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tint jobs..."
              style={{ paddingLeft: 30, paddingRight: 10, height: 34, borderRadius: 8, width: 200, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 13, outline: 'none' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => setNewJobOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#22c07a', color: '#0a2540', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={15} /> New Tint Job
          </button>
        </div>

        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {TINTING_STAGES.map(stage => (
            <TintStageColumn
              key={stage.id}
              stage={stage}
              projects={byStage[stage.id] || []}
              onJobClick={id => router.push(`/projects/${id}`)}
            />
          ))}
        </div>
      </div>

      <div className="md:hidden"><MobileNav /></div>

      {newJobOpen && (
        <NewTintJobModal
          orgId={orgId}
          userId={profile.id}
          onCreated={job => { setProjects(prev => [...prev, job]); setNewJobOpen(false) }}
          onClose={() => setNewJobOpen(false)}
        />
      )}
    </div>
  )
}
