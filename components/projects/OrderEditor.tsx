'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, ProjectStatus } from '@/types'
import {
  Save, ChevronRight, Car, Ship, Shield, Truck, Container, RectangleHorizontal,
  DollarSign, Percent, Clock, Target, Gauge, TrendingUp, TrendingDown,
  FileText, Palette, CalendarDays, User, Users, Tag, MapPin,
  Wrench, Scissors, Plus, Minus, SlidersHorizontal, CheckCircle2,
  Circle, ArrowRight, Upload, BadgeCheck, BadgeDollarSign, Info,
  Package, Layers, Hash, SquarePen, CircleDot, AlertTriangle
} from 'lucide-react'

// ── Props ────────────────────────────────────────────────────────────
interface OrderEditorProps {
  profile: Profile
  project: Project
  teammates: { id: string; name: string; role: string }[]
  onSave?: () => void
}

// ── Constants ────────────────────────────────────────────────────────
const COMM_VEHICLES = [
  { name: 'Small Car',  pay: 500, hrs: 14, cat: 'Car' },
  { name: 'Med Car',    pay: 550, hrs: 16, cat: 'Car' },
  { name: 'Full Car',   pay: 600, hrs: 17, cat: 'Car' },
  { name: 'Sm Truck',   pay: 525, hrs: 15, cat: 'Truck' },
  { name: 'Med Truck',  pay: 565, hrs: 16, cat: 'Truck' },
  { name: 'Full Truck', pay: 600, hrs: 17, cat: 'Truck' },
  { name: 'Med Van',    pay: 525, hrs: 15, cat: 'Van' },
  { name: 'Large Van',  pay: 600, hrs: 17, cat: 'Van' },
  { name: 'XL Van',     pay: 625, hrs: 18, cat: 'Van' },
]

const PPF_PACKAGES = [
  { name: 'Standard Front',  sale: 1200, pay: 144, hrs: 5,    mat: 380,  desc: 'Bumper + partial hood + mirrors' },
  { name: 'Full Front',      sale: 1850, pay: 220, hrs: 7,    mat: 580,  desc: 'Full bumper + hood + fenders + mirrors' },
  { name: 'Track Pack',      sale: 2800, pay: 336, hrs: 10,   mat: 900,  desc: 'Full front + A-pillars + rockers + door edges' },
  { name: 'Full Body',       sale: 5500, pay: 660, hrs: 20,   mat: 1800, desc: 'Complete vehicle protection' },
  { name: 'Hood Only',       sale: 650,  pay: 78,  hrs: 3,    mat: 200,  desc: 'Full hood + partial fender blends' },
  { name: 'Rocker Panels',   sale: 550,  pay: 66,  hrs: 2.5,  mat: 150,  desc: 'Side rockers + door bottoms' },
  { name: 'Headlights',      sale: 350,  pay: 42,  hrs: 1.5,  mat: 80,   desc: 'Both headlight assemblies' },
  { name: 'Door Cup Guards', sale: 150,  pay: 18,  hrs: 0.5,  mat: 40,   desc: 'All 4 door handle packs' },
]

const WRAP_COVERAGES = [
  'Full Wrap', 'Partial Wrap', 'Hood Only', 'Doors Only',
  'Sides Only', 'Rear Only', 'Full Front', 'Custom',
]

const ROOF_ADDONS = [
  { label: 'None', value: 0 },
  { label: 'Single Cab +$125', value: 125 },
  { label: 'Crew Cab +$175', value: 175 },
]

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'estimate', label: 'Estimate' },
  { value: 'active', label: 'Active' },
  { value: 'in_production', label: 'In Production' },
  { value: 'install_scheduled', label: 'Install Scheduled' },
  { value: 'installed', label: 'Installed' },
  { value: 'qc', label: 'QC' },
  { value: 'closing', label: 'Closing' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const DESIGN_STATUSES = ['Not Started', 'In Progress', 'Proof Sent', 'Approved']

// ── Formatting helpers ───────────────────────────────────────────────
const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fM2 = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
const fP = (n: number) => Math.round(n) + '%'
const v = (val: unknown, def = 0): number => parseFloat(String(val)) || def

// ── Shared styles ────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text1)', outline: 'none',
  fontFamily: 'inherit',
}
const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }
const monoNum: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function OrderEditor({ profile, project, teammates, onSave }: OrderEditorProps) {
  const supabase = createClient()
  const fd = (project.form_data as Record<string, unknown>) || {}

  // ── Active tab ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'quote' | 'design' | 'logistics'>('quote')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')

  // ── Job type state ─────────────────────────────────────────────────
  const [jobType, setJobType] = useState<'COMMERCIAL' | 'MARINE' | 'PPF'>(
    (fd.jobType as string)?.toUpperCase() === 'MARINE' ? 'MARINE'
      : (fd.jobType as string)?.toUpperCase() === 'PPF' ? 'PPF'
        : 'COMMERCIAL'
  )
  const [commSubType, setCommSubType] = useState<'Vehicle' | 'Trailer' | 'Box Truck'>(
    ((fd.commSubType as string) || (fd.subType as string) || 'Vehicle') as 'Vehicle' | 'Trailer' | 'Box Truck'
  )
  const [selectedVehicle, setSelectedVehicle] = useState<typeof COMM_VEHICLES[number] | null>(
    (fd.selectedVehicle as typeof COMM_VEHICLES[number]) || null
  )
  const [selectedPPF, setSelectedPPF] = useState<typeof PPF_PACKAGES[number] | null>(
    (fd.selectedPPF as typeof PPF_PACKAGES[number]) || null
  )

  // ── Form fields ────────────────────────────────────────────────────
  const [f, setF] = useState({
    // Client info
    clientName: (fd.clientName as string) || (fd.client as string) || project.title || '',
    bizName: (fd.bizName as string) || '',
    vehicleDesc: (fd.vehicleDesc as string) || (fd.vehicle as string) || project.vehicle_desc || '',
    vehicleColor: (fd.vehicleColor as string) || '',
    agent: (fd.agent as string) || profile.name || '',
    agentId: (fd.agentId as string) || project.agent_id || profile.id || '',
    leadType: (fd.leadType as string) || 'inbound',
    torqCompleted: (fd.torqCompleted as boolean) || false,
    installer: (fd.installer as string) || '',
    installerId: (fd.installerId as string) || project.installer_id || '',
    productionPerson: (fd.productionPerson as string) || 'Josh',
    referralSource: (fd.referralSource as string) || project.referral || '',
    installDate: (fd.installDate as string) || project.install_date || '',

    // Trailer / Box Truck dims
    trailerWidth: (fd.trailerWidth as string) || '',
    trailerHeight: (fd.trailerHeight as string) || '',
    trailerLaborPct: (fd.trailerLaborPct as string) || '10',
    boxWidth: (fd.boxWidth as string) || '',
    boxHeight: (fd.boxHeight as string) || '',
    boxLaborPct: (fd.boxLaborPct as string) || '10',

    // Marine
    hullLength: (fd.hullLength as string) || '',
    marinePasses: (fd.marinePasses as string) || '1',
    transom: (fd.transom as boolean) || false,
    hullHeight: (fd.hullHeight as string) || '',

    // Wrap coverage
    roofAddon: (fd.roofAddon as number) || 0,
    perfWindowFilm: (fd.perfWindowFilm as boolean) || false,
    wrapCoverage: (fd.wrapCoverage as string) || 'Full Wrap',

    // Material
    materialType: (fd.materialType as string) || '',
    materialOrderLink: (fd.materialOrderLink as string) || '',
    totalSqft: (fd.totalSqft as string) || (fd.sqft as string) || '',

    // Labor
    laborPct: (fd.laborPct as string) || '10',
    designFee: (fd.designFee as string) || '150',
    ratePerHr: (fd.ratePerHr as string) || '35',
    estHours: (fd.estHours as string) || '',
    miscCosts: (fd.miscCosts as string) || (fd.misc as string) || '0',

    // Prep work
    prepWork: (fd.prepWork as boolean) || false,
    rivets: (fd.rivets as boolean) || false,
    screws: (fd.screws as boolean) || false,

    // Override
    manualPayOverride: (fd.manualPayOverride as string) || '',
    salesPriceOverride: (fd.salesPriceOverride as string) || (fd.salesPrice as string) || '',

    // Scope
    specificParts: (fd.specificParts as string) || (fd.coverage as string) || '',
    exclusions: (fd.exclusions as string) || '',
    scopeOfWork: (fd.scopeOfWork as string) || '',

    // Margin target slider
    marginTarget: (fd.marginTarget as number) || (fd.margin ? v(fd.margin, 75) : 75),

    // ── Tab 2: Design & Scope ────────────────────────────────────────
    designInstructions: (fd.designInstructions as string) || (fd.designNotes as string) || '',
    brandColors: (fd.brandColors as string) || '',
    designerAssignment: (fd.designerAssignment as string) || '',
    designerAssignmentId: (fd.designerAssignmentId as string) || '',
    designStatus: (fd.designStatus as string) || 'Not Started',

    // ── Tab 3: Logistics & Status ────────────────────────────────────
    logisticsInstallDate: (fd.logisticsInstallDate as string) || project.install_date || '',
    logisticsInstaller: (fd.logisticsInstaller as string) || '',
    logisticsInstallerId: (fd.logisticsInstallerId as string) || project.installer_id || '',
    projectStatus: (fd.projectStatus as ProjectStatus) || project.status || 'estimate',
    logisticsNotes: (fd.logisticsNotes as string) || '',
  })

  function ff(key: string, val: unknown) {
    setF(p => ({ ...p, [key]: val }))
  }

  // ── Teammate filters ───────────────────────────────────────────────
  const agentTeam = teammates.filter(t => ['sales', 'admin'].includes(t.role))
  const installerTeam = teammates.filter(t => ['installer', 'admin', 'production'].includes(t.role))
  const designerTeam = teammates.filter(t => ['designer', 'admin'].includes(t.role))

  // ── Financials calculation ─────────────────────────────────────────
  const fin = useMemo(() => {
    const sqft = v(f.totalSqft)
    const marginTarget = v(f.marginTarget, 75) / 100
    const laborPct = v(f.laborPct, 10) / 100
    const designFee = v(f.designFee, 150)
    const misc = v(f.miscCosts, 0)
    const roofAddon = f.roofAddon || 0
    const prepCost = (f.rivets ? 70 : 0) + (f.screws ? 70 : 0)

    let material = 0
    let labor = 0
    let hrs = 0
    let sale = 0

    if (jobType === 'COMMERCIAL') {
      if (commSubType === 'Vehicle' && selectedVehicle) {
        // Vehicle quick-select
        labor = f.manualPayOverride ? v(f.manualPayOverride) : selectedVehicle.pay
        hrs = selectedVehicle.hrs
        // material from sqft * rate or a default
        material = sqft > 0 ? sqft * 2.10 : 0
        const cogs = material + labor + designFee + misc + roofAddon + prepCost
        sale = marginTarget > 0 ? cogs / (1 - marginTarget) : cogs
      } else if (commSubType === 'Trailer') {
        const tw = v(f.trailerWidth)
        const th = v(f.trailerHeight)
        const estSqft = tw > 0 && th > 0 ? tw * th * 2 : sqft
        material = estSqft * 2.10
        const cogs = material + designFee + misc + roofAddon + prepCost
        labor = cogs * v(f.trailerLaborPct, 10) / 100
        sale = marginTarget > 0 ? (cogs + labor) / (1 - marginTarget) : cogs + labor
        hrs = labor > 0 ? Math.ceil(labor / v(f.ratePerHr, 35)) : 0
      } else if (commSubType === 'Box Truck') {
        const bw = v(f.boxWidth)
        const bh = v(f.boxHeight) / 12
        const estSqft = bw > 0 && bh > 0 ? bw * bh * 2 : sqft
        material = estSqft * 2.10
        const cogs = material + designFee + misc + roofAddon + prepCost
        labor = cogs * v(f.boxLaborPct, 10) / 100
        sale = marginTarget > 0 ? (cogs + labor) / (1 - marginTarget) : cogs + labor
        hrs = labor > 0 ? Math.ceil(labor / v(f.ratePerHr, 35)) : 0
      }
    } else if (jobType === 'MARINE') {
      const hullLen = v(f.hullLength)
      const passes = v(f.marinePasses, 1)
      material = hullLen * passes * 2.50
      const cogs = material + designFee + misc + prepCost
      labor = cogs * laborPct
      sale = marginTarget > 0 ? (cogs + labor) / (1 - marginTarget) : cogs + labor
      hrs = labor > 0 ? Math.ceil(labor / v(f.ratePerHr, 35)) : 0
    } else if (jobType === 'PPF' && selectedPPF) {
      material = selectedPPF.mat
      labor = f.manualPayOverride ? v(f.manualPayOverride) : selectedPPF.pay
      hrs = selectedPPF.hrs
      sale = selectedPPF.sale
    }

    // Override: manual pay
    if (f.manualPayOverride && jobType !== 'PPF') {
      labor = v(f.manualPayOverride)
      hrs = labor > 0 ? Math.round(labor / v(f.ratePerHr, 35) * 10) / 10 : 0
    }

    // Override: sales price
    if (f.salesPriceOverride && v(f.salesPriceOverride) > 0) {
      sale = v(f.salesPriceOverride)
    }

    const cogs = material + labor + designFee + misc + roofAddon + prepCost
    const profit = sale - cogs
    const gpm = sale > 0 ? (profit / sale) * 100 : 0

    // Commission calculation
    const isPPF = jobType === 'PPF'
    const leadType = f.leadType
    let commBase = 0
    let commTorq = 0
    let commGpmBonus = 0
    let commTotal = 0
    let commLabel = ''

    if (leadType === 'presold') {
      // Pre-Sold: 5% flat on GP, no bonuses
      commTotal = profit * 0.05
      commLabel = 'Pre-Sold 5% flat on GP'
    } else if (leadType === 'inbound') {
      // Inbound: 4.5% base, +1% torq, +2% if GPM>73%, max 7.5%
      commBase = 4.5
      if (f.torqCompleted) commTorq = 1
      if (gpm > 73) commGpmBonus = 2
      // Protection: if GPM < 70% on non-PPF, base rate only
      if (!isPPF && gpm < 70) {
        commTorq = 0
        commGpmBonus = 0
      }
      let rate = Math.min(commBase + commTorq + commGpmBonus, 7.5) / 100
      commTotal = profit * rate
      commLabel = `Inbound ${Math.min(commBase + commTorq + commGpmBonus, 7.5)}% of GP`
    } else if (leadType === 'outbound') {
      // Outbound: 7% base, +1% torq, +2% if GPM>73%, max 10%
      commBase = 7
      if (f.torqCompleted) commTorq = 1
      if (gpm > 73) commGpmBonus = 2
      if (!isPPF && gpm < 70) {
        commTorq = 0
        commGpmBonus = 0
      }
      let rate = Math.min(commBase + commTorq + commGpmBonus, 10) / 100
      commTotal = profit * rate
      commLabel = `Outbound ${Math.min(commBase + commTorq + commGpmBonus, 10)}% of GP`
    }

    // Auto-calc est hours
    const estHours = hrs > 0 ? hrs : (labor > 0 ? Math.round(labor / v(f.ratePerHr, 35) * 10) / 10 : 0)

    return {
      sale,
      material,
      labor,
      hrs: estHours,
      designFee,
      misc: misc + roofAddon + prepCost,
      cogs,
      profit,
      gpm,
      commBase,
      commTorq,
      commGpmBonus,
      commTotal,
      commLabel,
    }
  }, [f, jobType, commSubType, selectedVehicle, selectedPPF])

  // ── Auto-fill sqft from vehicle selection ──────────────────────────
  useEffect(() => {
    if (jobType === 'COMMERCIAL' && commSubType === 'Vehicle' && selectedVehicle) {
      // Estimate sqft based on vehicle type
      const baseSqft: Record<string, number> = {
        'Small Car': 180, 'Med Car': 210, 'Full Car': 240,
        'Sm Truck': 200, 'Med Truck': 230, 'Full Truck': 260,
        'Med Van': 220, 'Large Van': 260, 'XL Van': 290,
      }
      const sq = baseSqft[selectedVehicle.name] || 200
      if (!f.totalSqft || v(f.totalSqft) === 0) {
        ff('totalSqft', sq.toString())
      }
    }
  }, [selectedVehicle])

  // ── Auto-fill est hours ────────────────────────────────────────────
  useEffect(() => {
    if (fin.hrs > 0) {
      ff('estHours', fin.hrs.toString())
    }
  }, [fin.hrs])

  // ── Save handler ───────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    const formData = {
      ...f,
      jobType,
      commSubType,
      selectedVehicle,
      selectedPPF,
    }

    const { error } = await supabase.from('projects').update({
      title: f.clientName || project.title,
      vehicle_desc: f.vehicleDesc || null,
      install_date: f.logisticsInstallDate || f.installDate || null,
      revenue: fin.sale || null,
      profit: fin.profit || null,
      gpm: fin.gpm || null,
      commission: fin.commTotal || null,
      status: (f.projectStatus as ProjectStatus) || project.status,
      agent_id: f.agentId || null,
      installer_id: f.logisticsInstallerId || f.installerId || null,
      referral: f.referralSource || null,
      form_data: formData,
      fin_data: {
        sales: fin.sale,
        cogs: fin.cogs,
        profit: fin.profit,
        gpm: fin.gpm,
        commission: fin.commTotal,
        labor: fin.labor,
        laborHrs: fin.hrs,
        material: fin.material,
        designFee: fin.designFee,
        misc: fin.misc,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      showToast('Order saved successfully')
      onSave?.()
    } else {
      showToast('Error saving: ' + error.message)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── Revenue % helper for line-item breakdown ──────────────────────
  function revPct(amount: number): string {
    return fin.sale > 0 ? fP((amount / fin.sale) * 100) : '0%'
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'relative' }}>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10,
          padding: '12px 20px', fontSize: 13, fontWeight: 700,
          color: 'var(--text1)', zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
          {toast}
        </div>
      )}

      {/* ── HEADER BAR ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24,
            fontWeight: 900, color: 'var(--text1)', lineHeight: 1,
          }}>
            Order Editor
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Hash size={12} />
            {project.id.slice(-8)}
            <span style={{ color: 'var(--text3)', margin: '0 4px' }}>|</span>
            {f.clientName || 'Untitled'}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 22px', fontWeight: 800,
            fontSize: 14, cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
            fontFamily: 'Barlow Condensed, sans-serif',
          }}
        >
          <Save size={16} />
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Order'}
        </button>
      </div>

      {/* ── TAB NAV ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: 'var(--surface)', borderRadius: 12,
        padding: 4, border: '1px solid var(--border)',
      }}>
        {([
          { key: 'quote' as const, label: 'Quote & Materials', icon: <DollarSign size={15} /> },
          { key: 'design' as const, label: 'Design & Scope', icon: <Palette size={15} /> },
          { key: 'logistics' as const, label: 'Logistics & Status', icon: <Truck size={15} /> },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '11px 16px', borderRadius: 10, fontSize: 13,
              fontWeight: 700, cursor: 'pointer', border: 'none',
              transition: 'all .15s ease',
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text3)',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── MAIN LAYOUT: Content + Sidebar ──────────────────────────── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── LEFT: Tab content ──────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 1: QUOTE & MATERIALS                                  */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'quote' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Client / Vehicle Info ──────────────────────────── */}
              <Section label="Client & Vehicle" icon={<User size={14} />}>
                <Grid cols={2}>
                  <Field label="Client Name">
                    <input style={inp} value={f.clientName} onChange={e => ff('clientName', e.target.value)} placeholder="John Smith" />
                  </Field>
                  <Field label="Business Name">
                    <input style={inp} value={f.bizName} onChange={e => ff('bizName', e.target.value)} placeholder="Smith Plumbing LLC" />
                  </Field>
                  <Field label="Vehicle / Unit Description">
                    <input style={inp} value={f.vehicleDesc} onChange={e => ff('vehicleDesc', e.target.value)} placeholder="2024 Ford Transit 350" />
                  </Field>
                  <Field label="Color">
                    <input style={inp} value={f.vehicleColor} onChange={e => ff('vehicleColor', e.target.value)} placeholder="White" />
                  </Field>
                </Grid>

                <Grid cols={3} style={{ marginTop: 12 }}>
                  <Field label="Agent">
                    <select style={sel} value={f.agentId} onChange={e => {
                      const mate = teammates.find(t => t.id === e.target.value)
                      ff('agentId', e.target.value)
                      ff('agent', mate?.name || '')
                    }}>
                      <option value="">Select agent</option>
                      {agentTeam.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Lead Type">
                    <select style={sel} value={f.leadType} onChange={e => ff('leadType', e.target.value)}>
                      <option value="inbound">Inbound -- 7.5% (4.5% base + bonuses)</option>
                      <option value="outbound">Outbound</option>
                      <option value="presold">Pre-Sold (5% flat)</option>
                    </select>
                  </Field>
                  <Field label="Torq Completed">
                    <div style={{ paddingTop: 4 }}>
                      <CheckToggle
                        label="+1% GP bonus"
                        checked={f.torqCompleted}
                        onChange={val => ff('torqCompleted', val)}
                      />
                    </div>
                  </Field>
                </Grid>

                <Grid cols={3} style={{ marginTop: 12 }}>
                  <Field label="Installer">
                    <select style={sel} value={f.installerId} onChange={e => {
                      const mate = teammates.find(t => t.id === e.target.value)
                      ff('installerId', e.target.value)
                      ff('installer', mate?.name || '')
                    }}>
                      <option value="">Unassigned</option>
                      {installerTeam.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Production Person">
                    <input style={inp} value={f.productionPerson} onChange={e => ff('productionPerson', e.target.value)} placeholder="Josh" />
                  </Field>
                  <Field label="Referral Source">
                    <input style={inp} value={f.referralSource} onChange={e => ff('referralSource', e.target.value)} placeholder="Google, referral name, etc." />
                  </Field>
                </Grid>

                <Grid cols={2} style={{ marginTop: 12 }}>
                  <Field label="Target Install Date">
                    <input style={inp} type="date" value={f.installDate} onChange={e => ff('installDate', e.target.value)} />
                  </Field>
                </Grid>
              </Section>

              {/* ── JOB TYPE ──────────────────────────────────────── */}
              <Section label="Job Type" icon={<Wrench size={14} />}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {([
                    { key: 'COMMERCIAL' as const, label: 'COMMERCIAL', icon: <Car size={16} /> },
                    { key: 'MARINE' as const, label: 'MARINE', icon: <Ship size={16} /> },
                    { key: 'PPF' as const, label: 'PPF', icon: <Shield size={16} /> },
                  ]).map(jt => (
                    <button
                      key={jt.key}
                      onClick={() => setJobType(jt.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 24px', borderRadius: 10, fontWeight: 800,
                        fontSize: 13, cursor: 'pointer',
                        border: '2px solid',
                        background: jobType === jt.key ? 'var(--accent)' : 'var(--surface2)',
                        borderColor: jobType === jt.key ? 'var(--accent)' : 'var(--border)',
                        color: jobType === jt.key ? '#fff' : 'var(--text2)',
                        fontFamily: 'Barlow Condensed, sans-serif',
                        letterSpacing: '.04em',
                      }}
                    >
                      {jt.icon}
                      {jt.label}
                    </button>
                  ))}
                </div>

                {/* ── COMMERCIAL sub-types ─────────────────────────── */}
                {jobType === 'COMMERCIAL' && (
                  <>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                      {([
                        { key: 'Vehicle' as const, icon: <Car size={14} /> },
                        { key: 'Trailer' as const, icon: <Container size={14} /> },
                        { key: 'Box Truck' as const, icon: <Truck size={14} /> },
                      ]).map(st => (
                        <button
                          key={st.key}
                          onClick={() => setCommSubType(st.key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 16px', borderRadius: 8, fontWeight: 700,
                            fontSize: 12, cursor: 'pointer', border: '1px solid',
                            background: commSubType === st.key ? 'rgba(79,127,255,.15)' : 'var(--surface2)',
                            borderColor: commSubType === st.key ? 'var(--accent)' : 'var(--border)',
                            color: commSubType === st.key ? 'var(--accent)' : 'var(--text3)',
                          }}
                        >
                          {st.icon}
                          {st.key}
                        </button>
                      ))}
                    </div>

                    {/* VEHICLE Quick Select Grid */}
                    {commSubType === 'Vehicle' && (
                      <div>
                        <div style={{
                          fontSize: 10, fontWeight: 800, color: 'var(--text3)',
                          textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10,
                        }}>
                          Quick Select
                        </div>
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 8,
                        }}>
                          {COMM_VEHICLES.map(veh => {
                            const isSelected = selectedVehicle?.name === veh.name
                            const ratePerHr = veh.pay / veh.hrs
                            return (
                              <button
                                key={veh.name}
                                onClick={() => setSelectedVehicle(veh)}
                                style={{
                                  padding: '12px 10px', borderRadius: 10,
                                  cursor: 'pointer', textAlign: 'center',
                                  border: '2px solid',
                                  background: isSelected ? 'rgba(79,127,255,.12)' : 'var(--surface2)',
                                  borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                                  transition: 'all .15s ease',
                                }}
                              >
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                                  {veh.name}
                                </div>
                                <div style={{ ...monoNum, fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>
                                  {fM(veh.pay)}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                                  {veh.hrs}hrs | {fM2(ratePerHr)}/hr
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* TRAILER fields */}
                    {commSubType === 'Trailer' && (
                      <Grid cols={3}>
                        <Field label="Width (ft)">
                          <input style={inp} type="number" value={f.trailerWidth} onChange={e => ff('trailerWidth', e.target.value)} placeholder="8" />
                        </Field>
                        <Field label="Height (ft)">
                          <input style={inp} type="number" value={f.trailerHeight} onChange={e => ff('trailerHeight', e.target.value)} placeholder="8" />
                        </Field>
                        <Field label="Default Labor %">
                          <input style={inp} type="number" value={f.trailerLaborPct} onChange={e => ff('trailerLaborPct', e.target.value)} placeholder="10" />
                        </Field>
                      </Grid>
                    )}

                    {/* BOX TRUCK fields */}
                    {commSubType === 'Box Truck' && (
                      <Grid cols={3}>
                        <Field label="Width (ft)">
                          <input style={inp} type="number" value={f.boxWidth} onChange={e => ff('boxWidth', e.target.value)} placeholder="8" />
                        </Field>
                        <Field label="Height (in)">
                          <input style={inp} type="number" value={f.boxHeight} onChange={e => ff('boxHeight', e.target.value)} placeholder="96" />
                        </Field>
                        <Field label="Default Labor %">
                          <input style={inp} type="number" value={f.boxLaborPct} onChange={e => ff('boxLaborPct', e.target.value)} placeholder="10" />
                        </Field>
                      </Grid>
                    )}
                  </>
                )}

                {/* ── MARINE fields ───────────────────────────────── */}
                {jobType === 'MARINE' && (
                  <Grid cols={2}>
                    <Field label="Hull Length (ft)">
                      <input style={inp} type="number" value={f.hullLength} onChange={e => ff('hullLength', e.target.value)} placeholder="22" />
                    </Field>
                    <Field label="Passes">
                      <input style={inp} type="number" value={f.marinePasses} onChange={e => ff('marinePasses', e.target.value)} placeholder="1" />
                    </Field>
                    <Field label="Hull Height (ft)">
                      <input style={inp} type="number" value={f.hullHeight} onChange={e => ff('hullHeight', e.target.value)} placeholder="4" />
                    </Field>
                    <Field label="Transom">
                      <div style={{ paddingTop: 4 }}>
                        <CheckToggle label="Include Transom" checked={f.transom} onChange={val => ff('transom', val)} />
                      </div>
                    </Field>
                  </Grid>
                )}

                {/* ── PPF Package Selector ────────────────────────── */}
                {jobType === 'PPF' && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 10,
                  }}>
                    {PPF_PACKAGES.map(pkg => {
                      const isSelected = selectedPPF?.name === pkg.name
                      return (
                        <button
                          key={pkg.name}
                          onClick={() => setSelectedPPF(pkg)}
                          style={{
                            padding: '14px', borderRadius: 10, cursor: 'pointer',
                            textAlign: 'left', border: '2px solid',
                            background: isSelected ? 'rgba(139,92,246,.1)' : 'var(--surface2)',
                            borderColor: isSelected ? '#8b5cf6' : 'var(--border)',
                            transition: 'all .15s ease',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text1)', marginBottom: 2 }}>
                            {pkg.name}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8, lineHeight: 1.4 }}>
                            {pkg.desc}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ ...monoNum, fontSize: 15, fontWeight: 800, color: '#8b5cf6' }}>
                              {fM(pkg.sale)}
                              <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>/sale</span>
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 10, color: 'var(--text3)' }}>
                            <span>{fM(pkg.pay)} inst</span>
                            <span>{fM(pkg.mat)} mat</span>
                            <span>{pkg.hrs}hrs</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </Section>

              {/* ── Roof Add-On ───────────────────────────────────── */}
              <Section label="Add-Ons" icon={<Plus size={14} />}>
                <Field label="Roof Add-On">
                  <div style={{ display: 'flex', gap: 6 }}>
                    {ROOF_ADDONS.map(ra => (
                      <button
                        key={ra.label}
                        onClick={() => ff('roofAddon', ra.value)}
                        style={{
                          padding: '7px 14px', borderRadius: 8, fontSize: 12,
                          fontWeight: 700, cursor: 'pointer', border: '1px solid',
                          background: f.roofAddon === ra.value ? 'rgba(79,127,255,.15)' : 'var(--surface2)',
                          borderColor: f.roofAddon === ra.value ? 'var(--accent)' : 'var(--border)',
                          color: f.roofAddon === ra.value ? 'var(--accent)' : 'var(--text2)',
                        }}
                      >
                        {ra.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <div style={{ marginTop: 12 }}>
                  <CheckToggle
                    label="Perforated Window Film"
                    checked={f.perfWindowFilm}
                    onChange={val => ff('perfWindowFilm', val)}
                  />
                </div>
              </Section>

              {/* ── Wrap Coverage ─────────────────────────────────── */}
              <Section label="Wrap Coverage" icon={<Layers size={14} />}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {WRAP_COVERAGES.map(cov => (
                    <button
                      key={cov}
                      onClick={() => ff('wrapCoverage', cov)}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: 12,
                        fontWeight: 700, cursor: 'pointer', border: '1px solid',
                        background: f.wrapCoverage === cov ? 'var(--accent)' : 'var(--surface2)',
                        borderColor: f.wrapCoverage === cov ? 'var(--accent)' : 'var(--border)',
                        color: f.wrapCoverage === cov ? '#fff' : 'var(--text2)',
                      }}
                    >
                      {cov}
                    </button>
                  ))}
                </div>
              </Section>

              {/* ── Material ──────────────────────────────────────── */}
              <Section label="Material" icon={<Package size={14} />}>
                <Grid cols={2}>
                  <Field label="Material Type">
                    <input style={inp} value={f.materialType} onChange={e => ff('materialType', e.target.value)} placeholder="3M IJ180Cv3, Avery MPI 1105, etc." />
                  </Field>
                  <Field label="Material Order Link">
                    <input style={inp} value={f.materialOrderLink} onChange={e => ff('materialOrderLink', e.target.value)} placeholder="https://..." />
                  </Field>
                </Grid>
                <Grid cols={1} style={{ marginTop: 12 }}>
                  <Field label="Total SQFT">
                    <input
                      style={{ ...inp, ...monoNum, maxWidth: 200 }}
                      type="number"
                      value={f.totalSqft}
                      onChange={e => ff('totalSqft', e.target.value)}
                      placeholder="Auto-filled from vehicle"
                    />
                  </Field>
                </Grid>
              </Section>

              {/* ── Labor ─────────────────────────────────────────── */}
              <Section label="Labor & Fees" icon={<Clock size={14} />}>
                <Grid cols={3}>
                  <Field label="Labor % of Sale">
                    <input style={inp} type="number" value={f.laborPct} onChange={e => ff('laborPct', e.target.value)} placeholder="10" />
                  </Field>
                  <Field label="Design Fee ($)">
                    <input style={{ ...inp, ...monoNum }} type="number" value={f.designFee} onChange={e => ff('designFee', e.target.value)} placeholder="150" />
                  </Field>
                  <Field label="Misc Costs ($)">
                    <input style={{ ...inp, ...monoNum }} type="number" value={f.miscCosts} onChange={e => ff('miscCosts', e.target.value)} placeholder="0" />
                  </Field>
                </Grid>
                <Grid cols={2} style={{ marginTop: 12 }}>
                  <Field label="Rate $/hr">
                    <input style={{ ...inp, ...monoNum }} type="number" value={f.ratePerHr} onChange={e => ff('ratePerHr', e.target.value)} placeholder="35" />
                  </Field>
                  <Field label="Est Hours (auto: Pay / Rate)">
                    <input
                      style={{ ...inp, ...monoNum, background: 'rgba(79,127,255,.08)', borderColor: 'rgba(79,127,255,.25)' }}
                      type="number"
                      value={f.estHours}
                      readOnly
                      placeholder="--"
                    />
                  </Field>
                </Grid>
              </Section>

              {/* ── Prep Work ─────────────────────────────────────── */}
              <Section label="Prep Work" icon={<Scissors size={14} />}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <CheckToggle
                    label="+Prep Work"
                    checked={f.prepWork}
                    onChange={val => {
                      ff('prepWork', val)
                      if (!val) { ff('rivets', false); ff('screws', false) }
                    }}
                  />
                </div>
                {f.prepWork && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => ff('rivets', !f.rivets)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 12,
                        fontWeight: 700, cursor: 'pointer', border: '1px solid',
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: f.rivets ? 'rgba(34,192,122,.12)' : 'var(--surface2)',
                        borderColor: f.rivets ? 'rgba(34,192,122,.4)' : 'var(--border)',
                        color: f.rivets ? 'var(--green)' : 'var(--text2)',
                      }}
                    >
                      {f.rivets ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                      Rivets +$70
                    </button>
                    <button
                      onClick={() => ff('screws', !f.screws)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 12,
                        fontWeight: 700, cursor: 'pointer', border: '1px solid',
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: f.screws ? 'rgba(34,192,122,.12)' : 'var(--surface2)',
                        borderColor: f.screws ? 'rgba(34,192,122,.4)' : 'var(--border)',
                        color: f.screws ? 'var(--green)' : 'var(--text2)',
                      }}
                    >
                      {f.screws ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                      Screws +$70
                    </button>
                  </div>
                )}
              </Section>

              {/* ── Manual Override ────────────────────────────────── */}
              <Section label="Manual Override" icon={<SlidersHorizontal size={14} />}>
                <Grid cols={2}>
                  <Field label="Pay ($) Override">
                    <input
                      style={{ ...inp, ...monoNum }}
                      type="number"
                      value={f.manualPayOverride}
                      onChange={e => ff('manualPayOverride', e.target.value)}
                      placeholder="Leave blank for auto"
                    />
                  </Field>
                  <Field label="Sale Price Override">
                    <input
                      style={{ ...inp, ...monoNum }}
                      type="number"
                      value={f.salesPriceOverride}
                      onChange={e => ff('salesPriceOverride', e.target.value)}
                      placeholder={fin.sale > 0 ? fM(fin.sale) + ' (auto)' : 'Leave blank for auto'}
                    />
                  </Field>
                </Grid>
              </Section>

              {/* ── Scope Details ─────────────────────────────────── */}
              <Section label="Scope Details" icon={<FileText size={14} />}>
                <Grid cols={1}>
                  <Field label="Specific Parts to Wrap">
                    <textarea
                      style={{ ...inp, minHeight: 70 }}
                      value={f.specificParts}
                      onChange={e => ff('specificParts', e.target.value)}
                      placeholder="Full vehicle minus roof, all panels including bumpers..."
                    />
                  </Field>
                  <Field label="Parts Not to Wrap / Exclusions">
                    <textarea
                      style={{ ...inp, minHeight: 70 }}
                      value={f.exclusions}
                      onChange={e => ff('exclusions', e.target.value)}
                      placeholder="Roof, mirrors, door handles..."
                    />
                  </Field>
                  <Field label="Scope of Work">
                    <textarea
                      style={{ ...inp, minHeight: 70 }}
                      value={f.scopeOfWork}
                      onChange={e => ff('scopeOfWork', e.target.value)}
                      placeholder="Full commercial wrap with cut vinyl lettering on rear..."
                    />
                  </Field>
                </Grid>
              </Section>

              {/* ── Bottom buttons ────────────────────────────────── */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '11px 24px', borderRadius: 10, fontWeight: 800,
                    fontSize: 13, cursor: 'pointer', border: 'none',
                    background: 'var(--red)', color: '#fff',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Save size={15} />
                  Save Estimate
                </button>
                <button
                  onClick={() => setActiveTab('design')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '11px 24px', borderRadius: 10, fontWeight: 800,
                    fontSize: 13, cursor: 'pointer', border: 'none',
                    background: 'var(--accent)', color: '#fff',
                    fontFamily: 'Barlow Condensed, sans-serif',
                  }}
                >
                  Next: Material & Design
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 2: DESIGN & SCOPE                                     */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'design' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <Section label="Design Instructions" icon={<SquarePen size={14} />}>
                <Field label="Design Instructions / Notes">
                  <textarea
                    style={{ ...inp, minHeight: 120 }}
                    value={f.designInstructions}
                    onChange={e => ff('designInstructions', e.target.value)}
                    placeholder="Describe the design layout, logo placement, text content, color scheme, etc."
                  />
                </Field>
              </Section>

              <Section label="Brand & Colors" icon={<Palette size={14} />}>
                <Field label="Brand Colors">
                  <input
                    style={inp}
                    value={f.brandColors}
                    onChange={e => ff('brandColors', e.target.value)}
                    placeholder="PMS 286C Blue, White, Black"
                  />
                </Field>
              </Section>

              <Section label="Reference Images" icon={<Upload size={14} />}>
                <div style={{
                  border: '2px dashed var(--border)', borderRadius: 12,
                  padding: '32px 24px', textAlign: 'center',
                  background: 'rgba(79,127,255,.03)',
                }}>
                  <Upload size={32} style={{ color: 'var(--text3)', marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
                    Drag and drop reference images here
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    File upload will be available in the next update
                  </div>
                </div>
              </Section>

              <Section label="Designer Assignment" icon={<Users size={14} />}>
                <Grid cols={2}>
                  <Field label="Assign Designer">
                    <select style={sel} value={f.designerAssignmentId} onChange={e => {
                      const mate = teammates.find(t => t.id === e.target.value)
                      ff('designerAssignmentId', e.target.value)
                      ff('designerAssignment', mate?.name || '')
                    }}>
                      <option value="">Select designer</option>
                      {designerTeam.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Design Status">
                    <div style={{ display: 'flex', gap: 6 }}>
                      {DESIGN_STATUSES.map(ds => (
                        <button
                          key={ds}
                          onClick={() => ff('designStatus', ds)}
                          style={{
                            flex: 1, padding: '8px 6px', borderRadius: 8,
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            border: '1px solid', textAlign: 'center',
                            background: f.designStatus === ds
                              ? ds === 'Approved' ? 'rgba(34,192,122,.15)' : 'rgba(79,127,255,.15)'
                              : 'var(--surface2)',
                            borderColor: f.designStatus === ds
                              ? ds === 'Approved' ? 'rgba(34,192,122,.4)' : 'rgba(79,127,255,.4)'
                              : 'var(--border)',
                            color: f.designStatus === ds
                              ? ds === 'Approved' ? 'var(--green)' : 'var(--accent)'
                              : 'var(--text3)',
                          }}
                        >
                          {ds}
                        </button>
                      ))}
                    </div>
                  </Field>
                </Grid>
              </Section>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 3: LOGISTICS & STATUS                                 */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'logistics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <Section label="Install Scheduling" icon={<CalendarDays size={14} />}>
                <Grid cols={2}>
                  <Field label="Install Date">
                    <input style={inp} type="date" value={f.logisticsInstallDate} onChange={e => ff('logisticsInstallDate', e.target.value)} />
                  </Field>
                  <Field label="Installer Assignment">
                    <select style={sel} value={f.logisticsInstallerId} onChange={e => {
                      const mate = teammates.find(t => t.id === e.target.value)
                      ff('logisticsInstallerId', e.target.value)
                      ff('logisticsInstaller', mate?.name || '')
                    }}>
                      <option value="">Unassigned</option>
                      {installerTeam.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </Field>
                </Grid>
              </Section>

              <Section label="Project Status" icon={<CircleDot size={14} />}>
                <Field label="Status">
                  <select style={sel} value={f.projectStatus} onChange={e => ff('projectStatus', e.target.value)}>
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </Field>
              </Section>

              <Section label="Notes" icon={<FileText size={14} />}>
                <Field label="Logistics / Internal Notes">
                  <textarea
                    style={{ ...inp, minHeight: 120 }}
                    value={f.logisticsNotes}
                    onChange={e => ff('logisticsNotes', e.target.value)}
                    placeholder="Scheduling notes, bay assignment, special instructions..."
                  />
                </Field>
              </Section>
            </div>
          )}
        </div>

        {/* ── RIGHT: Pricing Sidebar ─────────────────────────────────── */}
        <div style={{
          width: 320, flexShrink: 0, position: 'sticky', top: 16,
          maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {/* ── Final Sale Price ─────────────────────────────────── */}
            <div style={{
              padding: '20px 16px', textAlign: 'center',
              background: 'rgba(34,192,122,.06)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 900, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <DollarSign size={12} />
                FINAL SALE PRICE
              </div>
              <div style={{
                ...monoNum, fontSize: 36, fontWeight: 900, color: 'var(--green)',
                lineHeight: 1,
              }}>
                {fM(fin.sale)}
              </div>
            </div>

            {/* ── Key Metrics ──────────────────────────────────────── */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <MetricRow
                  label="Hard Costs (COGS)"
                  sublabel="Material + Install Pay + Design + Misc"
                  value={fM(fin.cogs)}
                  color="var(--text2)"
                />
                <MetricRow
                  label="Net Profit"
                  sublabel="Sale - COGS"
                  value={fM(fin.profit)}
                  color={fin.profit >= 0 ? 'var(--green)' : 'var(--red)'}
                />
                <MetricRow
                  label="Gross Margin %"
                  sublabel="Profit / Sale x 100"
                  value={fP(fin.gpm)}
                  color={fin.gpm >= 70 ? 'var(--green)' : fin.gpm >= 50 ? 'var(--amber)' : 'var(--red)'}
                />
              </div>
            </div>

            {/* ── Line-Item Breakdown ──────────────────────────────── */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                fontSize: 10, fontWeight: 900, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Layers size={12} />
                LINE-ITEM BREAKDOWN
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 700, color: 'var(--text3)', fontSize: 9, textTransform: 'uppercase' }}>Item</th>
                    <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 700, color: 'var(--text3)', fontSize: 9, textTransform: 'uppercase' }}>Qty/Rate</th>
                    <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 700, color: 'var(--text3)', fontSize: 9, textTransform: 'uppercase' }}>Cost</th>
                    <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 700, color: 'var(--text3)', fontSize: 9, textTransform: 'uppercase' }}>% Rev</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '5px 0', color: 'var(--text2)' }}>Labor (fixed)</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--text3)', fontSize: 10 }}>
                      {selectedVehicle ? selectedVehicle.name : commSubType}
                    </td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--cyan)' }}>{fM(fin.labor)}</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--text3)' }}>{revPct(fin.labor)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '5px 0', color: 'var(--text2)' }}>Material</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--text3)', fontSize: 10 }}>
                      {v(f.totalSqft) > 0 ? v(f.totalSqft) + ' sqft' : '--'}
                    </td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--cyan)' }}>{fM(fin.material)}</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--text3)' }}>{revPct(fin.material)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '5px 0', color: 'var(--text2)' }}>Design Fee</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--text3)', fontSize: 10 }}>--</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--cyan)' }}>{fM(fin.designFee)}</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--text3)' }}>{revPct(fin.designFee)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 0', color: 'var(--text1)', fontWeight: 700 }}>COGS Total</td>
                    <td style={{ textAlign: 'right', padding: '6px 0' }}></td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '6px 0', color: 'var(--amber)', fontWeight: 700 }}>{fM(fin.cogs)}</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '6px 0', color: 'var(--text3)' }}>{revPct(fin.cogs)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '6px 0', color: 'var(--green)', fontWeight: 700 }}>GP (Profit)</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '6px 0', color: 'var(--green)', fontSize: 10 }}>{fP(fin.gpm)}</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '6px 0', color: 'var(--green)', fontWeight: 700 }}>{fM(fin.profit)}</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '6px 0', color: 'var(--green)' }}>{revPct(fin.profit)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '5px 0', color: 'var(--purple)' }}>Sales Comm.</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--text3)', fontSize: 10 }}>on GP</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--purple)' }}>{fM(fin.commTotal)}</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '5px 0', color: 'var(--text3)' }}>{revPct(fin.commTotal)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', color: 'var(--text1)', fontWeight: 800, fontSize: 12 }}>Total Sale</td>
                    <td style={{ textAlign: 'right', padding: '6px 0' }}></td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '6px 0', color: 'var(--accent)', fontWeight: 800, fontSize: 13 }}>{fM(fin.sale)}</td>
                    <td style={{ ...monoNum, textAlign: 'right', padding: '6px 0', color: 'var(--text1)', fontWeight: 700 }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── Margin Target Slider ─────────────────────────────── */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 900, color: 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '.08em',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Target size={12} />
                  MARGIN TARGET
                </div>
                <div style={{ ...monoNum, fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                  {f.marginTarget}%
                </div>
              </div>
              <input
                type="range"
                min={40}
                max={90}
                step={1}
                value={f.marginTarget}
                onChange={e => ff('marginTarget', parseInt(e.target.value))}
                style={{
                  width: '100%', height: 6, borderRadius: 3,
                  appearance: 'none', background: 'var(--surface2)',
                  outline: 'none', cursor: 'pointer',
                  accentColor: '#4f7fff',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
                <span>40%</span>
                <span>90%</span>
              </div>
            </div>

            {/* ── Sales Commission Box ─────────────────────────────── */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{
                fontSize: 10, fontWeight: 900, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <BadgeDollarSign size={12} />
                SALES COMMISSION
              </div>

              {/* Commission summary */}
              <div style={{
                background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.25)',
                borderRadius: 10, padding: '12px',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>
                  {fin.commLabel}
                </div>
                <div style={{
                  ...monoNum, fontSize: 22, fontWeight: 900, color: '#8b5cf6',
                }}>
                  {fM(fin.commTotal)}
                </div>

                {/* Commission badges */}
                {f.leadType !== 'presold' && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
                    <CommBadge
                      label={`Base ${fin.commBase}%`}
                      active={true}
                      color="var(--accent)"
                    />
                    <CommBadge
                      label="+1% Torq?"
                      active={f.torqCompleted}
                      color="var(--cyan)"
                    />
                    <CommBadge
                      label="+2% GPM>73"
                      active={fin.gpm > 73}
                      color="var(--green)"
                    />
                  </div>
                )}

                {/* GPM protection warning */}
                {jobType !== 'PPF' && fin.gpm < 70 && f.leadType !== 'presold' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginTop: 10, padding: '6px 10px',
                    background: 'rgba(242,90,90,.1)', borderRadius: 6,
                    border: '1px solid rgba(242,90,90,.25)',
                  }}>
                    <AlertTriangle size={12} style={{ color: 'var(--red)' }} />
                    <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>
                      GPM &lt; 70% -- base rate only (protection)
                    </span>
                  </div>
                )}
              </div>

              {/* Commission rules info */}
              <div style={{
                marginTop: 10, padding: '10px', background: 'var(--surface2)',
                borderRadius: 8, border: '1px solid var(--border)',
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 800, color: 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Info size={10} />
                  COMMISSION RULES
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.7 }}>
                  <div><span style={{ color: 'var(--accent)', fontWeight: 700 }}>Inbound:</span> 4.5% base, +1% torq, +2% GPM&gt;73%, max 7.5%</div>
                  <div><span style={{ color: 'var(--cyan)', fontWeight: 700 }}>Outbound:</span> 7% base, +1% torq, +2% GPM&gt;73%, max 10%</div>
                  <div><span style={{ color: 'var(--purple)', fontWeight: 700 }}>Pre-Sold:</span> 5% flat on GP, no bonuses</div>
                  <div style={{ marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                    <span style={{ color: 'var(--red)', fontWeight: 700 }}>Protection:</span> GPM &lt; 70% on non-PPF = base only
                  </div>
                  <div style={{ marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                    <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Monthly GP Tier:</span>
                    <div>$0-50k = 7.5%/10%</div>
                    <div>$50-100k = 8%/11%</div>
                    <div>$100k+ = 9%/12%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════

function Section({ label, icon, children, color }: {
  label: string; icon?: React.ReactNode; children: React.ReactNode; color?: string
}) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 20, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11, fontWeight: 900, color: color || 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '.08em',
        paddingBottom: 12, marginBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

function Grid({ cols, children, style }: {
  cols: number; children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 12, ...style,
    }}>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 10, fontWeight: 800,
        color: 'var(--text3)', textTransform: 'uppercase',
        letterSpacing: '.06em', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function CheckToggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (val: boolean) => void
}) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      cursor: 'pointer', fontSize: 12, fontWeight: 600,
      color: checked ? 'var(--green)' : 'var(--text2)',
      userSelect: 'none',
    }}>
      <div
        onClick={(e) => { e.preventDefault(); onChange(!checked) }}
        style={{
          width: 18, height: 18, borderRadius: 4,
          border: `2px solid ${checked ? 'var(--green)' : 'var(--border)'}`,
          background: checked ? 'rgba(34,192,122,.15)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s ease', cursor: 'pointer',
        }}
      >
        {checked && <CheckCircle2 size={12} style={{ color: 'var(--green)' }} />}
      </div>
      {label}
    </label>
  )
}

function MetricRow({ label, sublabel, value, color }: {
  label: string; sublabel: string; value: string; color: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 0',
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)' }}>{label}</div>
        <div style={{ fontSize: 9, color: 'var(--text3)' }}>{sublabel}</div>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 15,
        fontWeight: 800, color,
      }}>
        {value}
      </div>
    </div>
  )
}

function CommBadge({ label, active, color }: {
  label: string; active: boolean; color: string
}) {
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 6, fontSize: 9,
      fontWeight: 800, letterSpacing: '.03em',
      background: active ? `${color}18` : 'var(--surface2)',
      border: `1px solid ${active ? `${color}40` : 'var(--border)'}`,
      color: active ? color : 'var(--text3)',
      textDecoration: active ? 'none' : 'line-through',
      opacity: active ? 1 : 0.5,
    }}>
      {label}
    </span>
  )
}
