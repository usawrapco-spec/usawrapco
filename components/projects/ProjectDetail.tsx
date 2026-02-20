'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile, Project, ProjectStatus, UserRole } from '@/types'
import { canAccess } from '@/types'
import FloatingFinancialBar from '@/components/financial/FloatingFinancialBar'
import JobChat from '@/components/chat/JobChat'
import JobImages from '@/components/images/JobImages'
import ProgressTicks from '@/components/pipeline/ProgressTicks'

interface Teammate { id: string; name: string; full_name?: string; role: UserRole; email?: string }
interface ProjectDetailProps { profile: Profile; project: Project; teammates: Teammate[] }

// ── Constants ─────────────────────────────────────────────────────────────────
const COMM_VEHICLES = [
  {name:'Small Car',  pay:500, hrs:14, cat:'Car'},
  {name:'Med Car',    pay:550, hrs:16, cat:'Car'},
  {name:'Full Car',   pay:600, hrs:17, cat:'Car'},
  {name:'Sm Truck',   pay:525, hrs:15, cat:'Truck'},
  {name:'Med Truck',  pay:565, hrs:16, cat:'Truck'},
  {name:'Full Truck', pay:600, hrs:17, cat:'Truck'},
  {name:'Med Van',    pay:525, hrs:15, cat:'Van'},
  {name:'Large Van',  pay:600, hrs:17, cat:'Van'},
  {name:'XL Van',     pay:625, hrs:18, cat:'Van'},
  {name:'XXL Van',    pay:700, hrs:20, cat:'Van'},
]
const WRAP_DETAILS = ['Full Wrap','Partial Wrap','Hood Only','Roof Only','Doors Only','Sides Only','Rear Only','Full Front','Custom']
const BOX_TRUCK_LENGTHS = [12,14,16,18,20,22,24,26]
const TRAILER_LENGTHS = [16,20,24,28,32,36,40,48,53]
const MARINE_LENGTHS = [10,14,16,18,20,22,24,26,28,30,35,40,50]
const PPF_PACKAGES = [
  {name:'Standard Front',  sale:1200, pay:144, hrs:5,  mat:380,  desc:'Bumper + partial hood + mirrors'},
  {name:'Full Front',      sale:1850, pay:220, hrs:7,  mat:580,  desc:'Full bumper + hood + fenders + mirrors'},
  {name:'Track Pack',      sale:2800, pay:336, hrs:10, mat:900,  desc:'Full front + A-pillars + rockers + door edges'},
  {name:'Full Body PPF',   sale:5500, pay:660, hrs:20, mat:1800, desc:'Complete vehicle protection'},
  {name:'Hood Only',       sale:650,  pay:78,  hrs:3,  mat:200,  desc:'Full hood + partial fender blends'},
  {name:'Rocker Panels',   sale:550,  pay:66,  hrs:2.5,mat:150,  desc:'Side rockers + door bottoms'},
  {name:'Headlights',      sale:350,  pay:42,  hrs:1.5,mat:80,   desc:'Both headlight assemblies'},
  {name:'Door Cup Guards', sale:150,  pay:18,  hrs:0.5,mat:40,   desc:'All 4 door handle packs'},
]
const MAT_RATES = [
  {label:'Avery MPI 1105',  rate:2.10},
  {label:'3M 2080 / IJ180', rate:2.50},
  {label:'Avery 1005EZ',    rate:1.85},
  {label:'Avery Supreme',   rate:2.80},
  {label:'Avery 900 (PPF)', rate:4.50},
]
const PIPE_STAGES = [
  {key:'sales_in',    label:'Sales Intake',   color:'#4f7fff'},
  {key:'production',  label:'Production',     color:'#22c07a'},
  {key:'install',     label:'Install',        color:'#22d3ee'},
  {key:'prod_review', label:'QC Review',      color:'#f59e0b'},
  {key:'sales_close', label:'Sales Close',    color:'#8b5cf6'},
]

const fM = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)
const fP = (n:number) => Math.round(n)+'%'
const v  = (val:any, def=0) => parseFloat(val)||def

// ── Main Component ────────────────────────────────────────────────────────────
export function ProjectDetail({ profile, project: initial, teammates }: ProjectDetailProps) {
  const [project, setProject] = useState<Project>(initial)
  const [tab, setTab]         = useState<1|2|3|4|5>(1)
  const [tab2Done, setTab2Done] = useState(false)
  const [tab3Done, setTab3Done] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [toast, setToast]     = useState('')

  // Job type state
  const [jobType, setJobTypeState] = useState<'Commercial'|'Marine'|'PPF'>(
    (initial.form_data as any)?.jobType || 'Commercial'
  )
  const [subType, setSubTypeState] = useState<'Vehicle'|'Box Truck'|'Trailer'>(
    (initial.form_data as any)?.subType || 'Vehicle'
  )
  const [selectedVehicle, setSelectedVehicle] = useState<any>(
    (initial.form_data as any)?.selectedVehicle || null
  )
  const [wrapDetail, setWrapDetail] = useState<string>(
    (initial.form_data as any)?.wrapDetail || 'Full Wrap'
  )
  const [selectedSides, setSelectedSides] = useState<Set<string>>(
    new Set((initial.form_data as any)?.selectedSides || ['left','right','rear'])
  )
  const [selectedPPF, setSelectedPPF] = useState<any>(
    (initial.form_data as any)?.selectedPPF || null
  )

  // Form fields
  const fd = (initial.form_data as any) || {}
  const [f, setF] = useState({
    // Client
    client: fd.client || initial.title || '',
    bizName: fd.bizName || '',
    phone: fd.phone || '',
    email: fd.email || '',
    vehicle: fd.vehicle || initial.vehicle_desc || '',
    vehicleColor: fd.vehicleColor || '',
    leadType: fd.leadType || 'inbound',
    agent: fd.agent || profile.name || '',
    installer: fd.installer || '',
    installDate: fd.installDate || initial.install_date || '',
    // Financials
    sqft: fd.sqft || '',
    matRate: fd.matRate || '2.10',
    margin: fd.margin || '75',
    laborPct: fd.laborPct || '10',
    designFee: fd.designFee || '150',
    misc: fd.misc || '0',
    salesPrice: fd.salesPrice || '',
    // Dimensions (box truck / trailer)
    len: fd.len || '',
    wid: fd.wid || '8.5',
    hft: fd.hft || '7',
    hin: fd.hin || '6',
    // Marine
    unitPrice: fd.unitPrice || '28.35',
    unitQty: fd.unitQty || '',
    // Tab 2 — Design
    designNeeded: fd.designNeeded || false,
    designNotes: fd.designNotes || '',
    assetStatus: fd.assetStatus || '',
    designComm: fd.designComm || '',
    revisionNotes: fd.revisionNotes || '',
    driveLink: fd.driveLink || '',
    approvalStatus: fd.approvalStatus || '',
    brandColors: fd.brandColors || '',
    printVendor: fd.printVendor || '',
    // Coverage
    coverage: fd.coverage || '',
    exclusions: fd.exclusions || '',
    warnings: fd.warnings || '',
    // Tab 3 — Logistics
    deposit: fd.deposit || false,
    contractSigned: fd.contractSigned || false,
    access: fd.access || '',
    scopeConfirm: fd.scopeConfirm || '',
    salesNotes: fd.salesNotes || '',
    internalNotes: fd.internalNotes || '',
  })

  const supabase = createClient()
  const router   = useRouter()
  const canEdit    = canAccess(profile.role, 'edit_projects')
  const canFinance = canAccess(profile.role, 'view_financials')

  // ── Derived financials ────────────────────────────────────────────────────
  const calc = useCallback(() => {
    const sqft    = v(f.sqft)
    const matRate = v(f.matRate, 2.10)
    const margin  = v(f.margin, 75) / 100
    const laborPct = v(f.laborPct, 10) / 100
    const designFee = v(f.designFee, 150)
    const misc    = v(f.misc, 0)

    let material = 0, labor = 0, hrs = 0, sale = 0

    if (jobType === 'Commercial' && subType === 'Vehicle' && selectedVehicle) {
      // Vehicle: flat rate
      material = sqft * matRate
      labor    = selectedVehicle.pay
      hrs      = selectedVehicle.hrs
      const cogs = material + labor + designFee + misc
      sale = margin > 0 ? cogs / (1 - margin) : cogs
    } else if (jobType === 'PPF' && selectedPPF) {
      material = selectedPPF.mat
      labor    = selectedPPF.pay
      hrs      = selectedPPF.hrs
      sale     = selectedPPF.sale
    } else if (jobType === 'Marine') {
      const unitPrice = v(f.unitPrice, 28.35)
      const unitQty   = v(f.unitQty, 0)
      material = unitPrice * unitQty
      const cogs = material + designFee + misc
      labor = cogs * laborPct
      sale  = margin > 0 ? (cogs + labor) / (1 - margin) : cogs + labor
      hrs   = Math.ceil(labor / 35)
    } else {
      // Box truck / trailer / custom dims
      material = sqft * matRate
      const cogs = material + designFee + misc
      labor = cogs * laborPct
      sale  = margin > 0 ? (cogs + labor) / (1 - margin) : cogs + labor
      hrs   = Math.ceil(labor / 35)
    }

    // Manual override
    if (f.salesPrice && v(f.salesPrice) > 0) sale = v(f.salesPrice)

    const cogs   = material + labor + designFee + misc
    const profit = sale - cogs
    const gpm    = sale > 0 ? (profit / sale) * 100 : 0
    const leadType = f.leadType
    const commRate = leadType === 'outbound' ? 0.10 : leadType === 'presold' ? 0.05 : 0.075
    const commission = profit * commRate

    return { sale, material, labor, hrs, designFee, misc, cogs, profit, gpm, commission }
  }, [f, jobType, subType, selectedVehicle, selectedPPF])

  const fin = calc()

  // ── Sqft calculator for dims ───────────────────────────────────────────────
  function calcSqft() {
    const l = v(f.len), w = v(f.wid), hft = v(f.hft), hin = v(f.hin)
    const h = hft + hin/12
    let net = 0
    selectedSides.forEach(s => {
      if (s === 'left' || s === 'right') net += l * h
      else if (s === 'rear') net += w * h
      else if (s === 'front') net += w * h
    })
    if (net > 0) setF(p => ({...p, sqft: Math.round(net).toString()}))
  }

  function ff(key: string, val: any) { setF(p => ({...p, [key]: val})) }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save(updates: any = {}) {
    setSaving(true)
    const formData = { ...f, jobType, subType, wrapDetail, selectedVehicle, selectedPPF,
                       selectedSides: Array.from(selectedSides) }
    const finData  = fin
    const { error } = await supabase.from('projects').update({
      title:        f.client || project.title,
      vehicle_desc: f.vehicle,
      install_date: f.installDate || null,
      revenue:      fin.sale || null,
      profit:       fin.profit || null,
      gpm:          fin.gpm || null,
      commission:   fin.commission || null,
      form_data:    formData,
      fin_data:     finData,
      updated_at:   new Date().toISOString(),
      ...updates,
    }).eq('id', project.id)
    setSaving(false)
    if (!error) {
      setProject(p => ({...p, ...updates}))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function advancePipeline() {
    const order = ['sales_in','production','install','prod_review','sales_close']
    const cur   = project.pipe_stage || 'sales_in'
    const idx   = order.indexOf(cur)
    if (idx < 0) return
    const next  = idx < order.length-1 ? order[idx+1] : 'done'
    const newStatus = next === 'done' ? 'closed' : project.status
    await save({ pipe_stage: next, status: newStatus })
    showToast(`Moved to ${PIPE_STAGES.find(s=>s.key===next)?.label || 'Done'} ✓`)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function saveAsSalesOrder() {
    if (!tab2Done) { showToast('⚠ Complete Tab 2 (Design & Scope) first'); setTab(2); return }
    if (!tab3Done) { showToast('⚠ Complete Tab 3 (Logistics) first'); setTab(3); return }
    await save({ status: 'active', pipe_stage: 'production' })
    showToast('🎉 Sent to Production!')
  }

  // ── Build financial data object for FloatingFinancialBar ────────────────────
  const financialProject = {
    revenue: fin.sale,
    profit: fin.profit,
    gpm: fin.gpm,
    commission: fin.commission,
    fin_data: {
      material_cost: fin.material,
      labor_cost: fin.labor,
      design_fee: fin.designFee,
      cogs: fin.cogs,
      install_pay: fin.labor,
      hrs_budget: fin.hrs,
      material_sqft: v(f.sqft),
      labor_pct: v(f.laborPct, 10),
      comm_base: 4.5,
      comm_inbound: f.leadType === 'inbound' ? 1 : 0,
      comm_gpm_bonus: fin.gpm > 73 ? 2 : 0,
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const gpmC = fin.gpm >= 70 ? '#22c07a' : fin.gpm >= 55 ? '#f59e0b' : '#f25a5a'
  const curStage = PIPE_STAGES.find(s => s.key === project.pipe_stage)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:20, right:20, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 20px', fontSize:13, fontWeight:700, color:'var(--text1)', zIndex:9999, boxShadow:'0 8px 32px rgba(0,0,0,.4)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, color:'var(--text2)', cursor:'pointer' }}>
            ← Back
          </button>
          <div>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:22, fontWeight:900, color:'var(--text1)', lineHeight:1 }}>
              {f.client || 'Untitled Job'}
            </div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
              #{project.id.slice(-8)} · {f.vehicle || 'No vehicle'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* Pipeline stage badge */}
          {curStage && (
            <div style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:800, background:`${curStage.color}18`, color:curStage.color, border:`1px solid ${curStage.color}40` }}>
              {curStage.label}
            </div>
          )}
          <button onClick={() => save()} disabled={saving} style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:9, padding:'9px 18px', fontWeight:800, fontSize:13, cursor:'pointer', opacity:saving?.6:1 }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Progress Ticks — pipeline overview */}
      <div style={{ marginBottom: 16 }}>
        <ProgressTicks currentStage={project.pipe_stage || 'sales_in'} />
      </div>

      {/* Floating Financial Bar — replaces old stat strip */}
      {canFinance && (
        <div style={{ marginBottom: 16 }}>
          <FloatingFinancialBar project={financialProject} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--surface)', overflowX:'auto' }}>
          {([1,2,3,4,5] as const).map(n => {
            const labels: Record<number, string> = {1:'Quote & Materials', 2:'Design & Scope', 3:'Logistics & Status', 4:'💬 Chat', 5:'📷 Images'}
            const done   = n===2 ? tab2Done : n===3 ? tab3Done : false
            return (
              <button key={n} onClick={() => setTab(n)} style={{
                display:'flex', alignItems:'center', gap:8, padding:'12px 24px',
                fontSize:13, fontWeight:700, cursor:'pointer', border:'none',
                borderBottom: tab===n ? '2px solid var(--accent)' : '2px solid transparent',
                background:'transparent',
                color: tab===n ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text3)',
                marginBottom:-1, whiteSpace:'nowrap',
              }}>
                {n <= 3 && (
                  <span style={{
                    width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:900,
                    background: tab===n ? 'var(--accent)' : done ? 'var(--green)' : 'var(--surface2)',
                    color: tab===n || done ? '#fff' : 'var(--text3)',
                    border: `1px solid ${tab===n ? 'var(--accent)' : done ? 'var(--green)' : 'var(--border)'}`,
                  }}>{done && n!==tab ? '✓' : n}</span>
                )}
                {labels[n]}
              </button>
            )
          })}
        </div>

        <div style={{ padding:24 }}>
          {tab === 1 && <Tab1 f={f} ff={ff} jobType={jobType} setJobType={setJobTypeState} subType={subType} setSubType={setSubTypeState} selectedVehicle={selectedVehicle} setSelectedVehicle={setSelectedVehicle} wrapDetail={wrapDetail} setWrapDetail={setWrapDetail} selectedSides={selectedSides} setSelectedSides={setSelectedSides} selectedPPF={selectedPPF} setSelectedPPF={setSelectedPPF} calcSqft={calcSqft} fin={fin} canFinance={canFinance} teammates={teammates} onNext={() => setTab(2)} onSaveOrder={saveAsSalesOrder} profile={profile} />}
          {tab === 2 && <Tab2 f={f} ff={ff} onComplete={() => { setTab2Done(true); setTab(3) }} />}
          {tab === 3 && <Tab3 f={f} ff={ff} project={project} teammates={teammates} onComplete={() => { setTab3Done(true) }} onAdvance={advancePipeline} onSaveOrder={saveAsSalesOrder} profile={profile} curStage={project.pipe_stage || 'sales_in'} />}
          {tab === 4 && (
            <JobChat
              projectId={project.id}
              orgId={project.org_id}
              currentUserId={profile.id}
              currentUserName={profile.full_name || profile.name}
            />
          )}
          {tab === 5 && (
            <JobImages
              projectId={project.id}
              orgId={project.org_id}
              currentUserId={profile.id}
              vehicleType={(project.form_data as any)?.selectedVehicle?.name || ''}
              wrapScope={(project.form_data as any)?.wrapDetail || ''}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Stat({ label, value, color }: { label:string; value:string; color:string }) {
  return (
    <div>
      <div style={{ fontSize:9, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:2 }}>{label}</div>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:15, fontWeight:700, color }}>{value}</div>
    </div>
  )
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  )
}
const inp: React.CSSProperties = {
  width:'100%', background:'var(--surface2)', border:'1px solid var(--border)',
  borderRadius:8, padding:'9px 12px', fontSize:13, color:'var(--text1)', outline:'none',
}
const sel: React.CSSProperties = { ...inp }

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — QUOTE & MATERIALS
// ═══════════════════════════════════════════════════════════════════════════════
function Tab1({ f, ff, jobType, setJobType, subType, setSubType, selectedVehicle, setSelectedVehicle, wrapDetail, setWrapDetail, selectedSides, setSelectedSides, selectedPPF, setSelectedPPF, calcSqft, fin, canFinance, teammates, onNext, onSaveOrder, profile }: any) {
  const isVehicle = jobType === 'Commercial' && subType === 'Vehicle'
  const isBox     = jobType === 'Commercial' && subType === 'Box Truck'
  const isTrailer = jobType === 'Commercial' && subType === 'Trailer'
  const isMarine  = jobType === 'Marine'
  const isPPF     = jobType === 'PPF'

  const installerTeam = teammates.filter((t:any) => ['installer','admin','production'].includes(t.role))
  const agentTeam     = teammates.filter((t:any) => ['sales','admin'].includes(t.role))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Client Info */}
      <Section label="Client Info">
        <Grid cols={3}>
          <Field label="Client Name *"><input style={inp} value={f.client} onChange={e=>ff('client',e.target.value)} placeholder="John Smith" /></Field>
          <Field label="Business Name"><input style={inp} value={f.bizName} onChange={e=>ff('bizName',e.target.value)} placeholder="Smith Plumbing LLC" /></Field>
          <Field label="Phone"><input style={inp} value={f.phone} onChange={e=>ff('phone',e.target.value)} placeholder="(555) 000-0000" /></Field>
          <Field label="Email"><input style={inp} value={f.email} onChange={e=>ff('email',e.target.value)} placeholder="client@email.com" /></Field>
          <Field label="Vehicle"><input style={inp} value={f.vehicle} onChange={e=>ff('vehicle',e.target.value)} placeholder="2024 Ford Transit 350" /></Field>
          <Field label="Color"><input style={inp} value={f.vehicleColor} onChange={e=>ff('vehicleColor',e.target.value)} placeholder="White" /></Field>
        </Grid>
        <Grid cols={3} style={{marginTop:12}}>
          <Field label="Lead Type">
            <select style={sel} value={f.leadType} onChange={e=>ff('leadType',e.target.value)}>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
              <option value="presold">Pre-sold / Referral</option>
            </select>
          </Field>
          <Field label="Agent">
            <select style={sel} value={f.agent} onChange={e=>ff('agent',e.target.value)}>
              <option value="">Select agent</option>
              {agentTeam.map((t:any) => <option key={t.id} value={t.name}>{t.name}</option>)}
              <option value={profile.name}>{profile.name} (me)</option>
            </select>
          </Field>
          <Field label="Installer (assign now or later)">
            <select style={sel} value={f.installer} onChange={e=>ff('installer',e.target.value)}>
              <option value="">Unassigned</option>
              {installerTeam.map((t:any) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </Field>
        </Grid>
      </Section>

      {/* Job Type Selector */}
      <Section label="Job Type">
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          {(['Commercial','Marine','PPF'] as const).map(jt => (
            <button key={jt} onClick={() => setJobType(jt)} style={{
              padding:'8px 20px', borderRadius:9, fontWeight:800, fontSize:13, cursor:'pointer', border:'2px solid',
              background: jobType===jt ? 'var(--accent)' : 'var(--surface2)',
              borderColor: jobType===jt ? 'var(--accent)' : 'var(--border)',
              color: jobType===jt ? '#fff' : 'var(--text2)',
            }}>{jt === 'Commercial' ? '🚗 Vehicle Wrap' : jt === 'Marine' ? '⛵ Marine' : '🛡 PPF'}</button>
          ))}
        </div>

        {/* Sub-type for Commercial */}
        {jobType === 'Commercial' && (
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {(['Vehicle','Box Truck','Trailer'] as const).map(st => (
              <button key={st} onClick={() => setSubType(st)} style={{
                padding:'6px 16px', borderRadius:7, fontWeight:700, fontSize:12, cursor:'pointer', border:'1px solid',
                background: subType===st ? 'rgba(79,127,255,.15)' : 'var(--surface2)',
                borderColor: subType===st ? 'var(--accent)' : 'var(--border)',
                color: subType===st ? 'var(--accent)' : 'var(--text3)',
              }}>{st}</button>
            ))}
          </div>
        )}
      </Section>

      {/* Vehicle selector grid */}
      {isVehicle && (
        <Section label="Select Vehicle Type">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8, marginBottom:16 }}>
            {COMM_VEHICLES.map(veh => (
              <button key={veh.name} onClick={() => setSelectedVehicle(veh)} style={{
                padding:'10px 8px', borderRadius:10, cursor:'pointer', textAlign:'center', border:'2px solid',
                background: selectedVehicle?.name===veh.name ? 'rgba(79,127,255,.12)' : 'var(--surface2)',
                borderColor: selectedVehicle?.name===veh.name ? 'var(--accent)' : 'var(--border)',
              }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text1)', marginBottom:2 }}>{veh.name}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'var(--green)' }}>{fM(veh.pay)}</div>
                <div style={{ fontSize:10, color:'var(--text3)' }}>{veh.hrs}h</div>
              </button>
            ))}
          </div>

          {/* Wrap detail */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Wrap Coverage</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {WRAP_DETAILS.map(d => (
                <button key={d} onClick={() => setWrapDetail(d)} style={{
                  padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', border:'1px solid',
                  background: wrapDetail===d ? 'var(--accent)' : 'var(--surface2)',
                  borderColor: wrapDetail===d ? 'var(--accent)' : 'var(--border)',
                  color: wrapDetail===d ? '#fff' : 'var(--text2)',
                }}>{d}</button>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Trailer / Box Truck dims */}
      {(isBox || isTrailer) && (
        <Section label={`${subType} Dimensions`}>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Quick Length</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {(isBox ? BOX_TRUCK_LENGTHS : TRAILER_LENGTHS).map(l => (
                <button key={l} onClick={() => { ff('len', l.toString()); setTimeout(calcSqft, 50) }} style={{
                  padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', border:'1px solid var(--border)',
                  background: f.len===l.toString() ? 'var(--accent)' : 'var(--surface2)',
                  color: f.len===l.toString() ? '#fff' : 'var(--text2)',
                }}>{l}ft</button>
              ))}
            </div>
          </div>
          <Grid cols={4}>
            <Field label="Length (ft)"><input style={inp} type="number" value={f.len} onChange={e=>ff('len',e.target.value)} onBlur={calcSqft} placeholder="20" /></Field>
            <Field label="Width (ft)"><input style={inp} type="number" value={f.wid} onChange={e=>ff('wid',e.target.value)} onBlur={calcSqft} placeholder="8.5" /></Field>
            <Field label="Height ft"><input style={inp} type="number" value={f.hft} onChange={e=>ff('hft',e.target.value)} onBlur={calcSqft} placeholder="7" /></Field>
            <Field label="Height in"><input style={inp} type="number" value={f.hin} onChange={e=>ff('hin',e.target.value)} onBlur={calcSqft} placeholder="6" /></Field>
          </Grid>
          {/* Sides selector */}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Sides to Wrap</div>
            <div style={{ display:'flex', gap:8 }}>
              {['left','right','rear','front'].map(s => (
                <label key={s} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, fontWeight:700, color: selectedSides.has(s) ? 'var(--accent)' : 'var(--text3)' }}>
                  <input type="checkbox" checked={selectedSides.has(s)} onChange={() => {
                    const ns = new Set(selectedSides)
                    ns.has(s) ? ns.delete(s) : ns.add(s)
                    setSelectedSides(ns)
                    setTimeout(calcSqft, 50)
                  }} />
                  {s.charAt(0).toUpperCase()+s.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Marine */}
      {isMarine && (
        <Section label="Marine Dimensions">
          <div style={{ marginBottom:10 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {MARINE_LENGTHS.map(l => (
                <button key={l} onClick={() => ff('len', l.toString())} style={{
                  padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', border:'1px solid var(--border)',
                  background: f.len===l.toString() ? 'var(--cyan)' : 'var(--surface2)',
                  color: f.len===l.toString() ? '#0d0f14' : 'var(--text2)',
                }}>{l}'</button>
              ))}
            </div>
          </div>
          <Grid cols={3}>
            <Field label="$/Linear Ft"><input style={inp} type="number" value={f.unitPrice} onChange={e=>ff('unitPrice',e.target.value)} placeholder="28.35" /></Field>
            <Field label="Linear Ft to Order"><input style={inp} type="number" value={f.unitQty} onChange={e=>ff('unitQty',e.target.value)} placeholder="0" /></Field>
            <Field label="Boat Length (ft)"><input style={inp} type="number" value={f.len} onChange={e=>ff('len',e.target.value)} placeholder="24" /></Field>
          </Grid>
        </Section>
      )}

      {/* PPF */}
      {isPPF && (
        <Section label="PPF Package">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
            {PPF_PACKAGES.map(pkg => (
              <button key={pkg.name} onClick={() => setSelectedPPF(pkg)} style={{
                padding:'14px', borderRadius:10, cursor:'pointer', textAlign:'left', border:'2px solid',
                background: selectedPPF?.name===pkg.name ? 'rgba(167,139,250,.1)' : 'var(--surface2)',
                borderColor: selectedPPF?.name===pkg.name ? '#8b5cf6' : 'var(--border)',
              }}>
                <div style={{ fontSize:13, fontWeight:800, color:'var(--text1)', marginBottom:4 }}>{pkg.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{pkg.desc}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:14, color:'#8b5cf6', fontWeight:700 }}>{fM(pkg.sale)}</div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Material & Pricing */}
      <Section label="Material & Pricing">
        <Grid cols={3}>
          {!isPPF && (
            <Field label="Material Rate">
              <select style={sel} value={f.matRate} onChange={e=>ff('matRate',e.target.value)}>
                {MAT_RATES.map(m => <option key={m.rate} value={m.rate}>{m.label} — ${m.rate}/sqft</option>)}
              </select>
            </Field>
          )}
          <Field label="Net Sqft">
            <input style={inp} type="number" value={f.sqft} onChange={e=>ff('sqft',e.target.value)} placeholder="0" />
          </Field>
          <Field label="Design Fee ($)">
            <input style={inp} type="number" value={f.designFee} onChange={e=>ff('designFee',e.target.value)} placeholder="150" />
          </Field>
          <Field label="Misc Costs ($)">
            <input style={inp} type="number" value={f.misc} onChange={e=>ff('misc',e.target.value)} placeholder="0" />
          </Field>
          {!isVehicle && !isPPF && (
            <Field label="Labor % of COGS">
              <input style={inp} type="number" value={f.laborPct} onChange={e=>ff('laborPct',e.target.value)} placeholder="10" min="1" max="40" />
            </Field>
          )}
          <Field label="Target GPM %">
            <input style={inp} type="number" value={f.margin} onChange={e=>ff('margin',e.target.value)} placeholder="75" min="30" max="90" />
          </Field>
        </Grid>

        {/* Manual price override */}
        <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:12 }}>
          <Field label="Override Sale Price (optional)">
            <input style={{...inp, width:200}} type="number" value={f.salesPrice} onChange={e=>ff('salesPrice',e.target.value)} placeholder={fM(fin.sale)+' (calculated)'} />
          </Field>
        </div>
      </Section>

      {/* Part to wrap / exclusions */}
      <Section label="Scope">
        <Grid cols={2}>
          <Field label="Parts to Wrap / Coverage">
            <textarea style={{...inp, minHeight:80}} value={f.coverage} onChange={e=>ff('coverage',e.target.value)} placeholder="Full vehicle, all panels except roof and glass..." />
          </Field>
          <Field label="Parts NOT to Wrap / Exclusions">
            <textarea style={{...inp, minHeight:80}} value={f.exclusions} onChange={e=>ff('exclusions',e.target.value)} placeholder="Mirrors, door handles, roof rails, glass, emblems..." />
          </Field>
        </Grid>
      </Section>

      {/* Footer actions */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:8, borderTop:'1px solid var(--border)' }}>
        <div style={{ fontSize:12, color:'var(--text3)' }}>
          Save estimate at any time · Complete Tabs 2 & 3 to send to Production
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => {}} style={{ padding:'9px 20px', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)' }}>
            💾 Save Estimate
          </button>
          <button onClick={onNext} style={{ padding:'9px 20px', borderRadius:9, fontWeight:800, fontSize:13, cursor:'pointer', background:'var(--green)', border:'none', color:'#0d1a10' }}>
            Next: Design & Scope →
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — DESIGN & SCOPE
// ═══════════════════════════════════════════════════════════════════════════════
function Tab2({ f, ff, onComplete }: any) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Section label="Design & Artwork">
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <input type="checkbox" id="designNeeded" checked={f.designNeeded} onChange={e=>ff('designNeeded',e.target.checked)} />
          <label htmlFor="designNeeded" style={{ fontSize:13, fontWeight:600, cursor:'pointer', color:'var(--text1)' }}>Design / Artwork Required?</label>
        </div>
        <Grid cols={2}>
          <Field label="Design Instructions & Placement">
            <textarea style={{...inp,minHeight:90}} value={f.designNotes} onChange={e=>ff('designNotes',e.target.value)} placeholder="Logo placement, color references, text content, bleed zones..." />
          </Field>
          <Field label="File / Asset Status">
            <textarea style={{...inp,minHeight:90}} value={f.assetStatus} onChange={e=>ff('assetStatus',e.target.value)} placeholder="What files do we have? What's missing?" />
          </Field>
          <Field label="Last Customer Communication">
            <textarea style={{...inp,minHeight:80}} value={f.designComm} onChange={e=>ff('designComm',e.target.value)} placeholder="Summary of last call/email — include date..." />
          </Field>
          <Field label="Revision Notes / Change Log">
            <textarea style={{...inp,minHeight:80}} value={f.revisionNotes} onChange={e=>ff('revisionNotes',e.target.value)} placeholder="Track revision history, customer feedback..." />
          </Field>
        </Grid>
        <Grid cols={3} style={{marginTop:12}}>
          <Field label="Google Drive / Asset Folder">
            <input style={inp} type="url" value={f.driveLink} onChange={e=>ff('driveLink',e.target.value)} placeholder="https://drive.google.com/..." />
          </Field>
          <Field label="Approval Status">
            <select style={sel} value={f.approvalStatus} onChange={e=>ff('approvalStatus',e.target.value)}>
              <option value="">Not Started</option>
              <option value="proof_sent">Proof Sent — Awaiting Approval</option>
              <option value="revisions">Revisions Requested</option>
              <option value="approved">Design Approved ✓</option>
            </select>
          </Field>
          <Field label="Print Vendor">
            <input style={inp} value={f.printVendor} onChange={e=>ff('printVendor',e.target.value)} placeholder="Signs By Tomorrow, in-house..." />
          </Field>
          <Field label="Brand Colors / Pantone">
            <input style={inp} value={f.brandColors} onChange={e=>ff('brandColors',e.target.value)} placeholder="PMS 286C Blue, white, black" />
          </Field>
        </Grid>
      </Section>

      <Section label="Pre-Install Notes">
        <Field label="Warnings / Pre-existing Conditions">
          <textarea style={{...inp,minHeight:80}} value={f.warnings} onChange={e=>ff('warnings',e.target.value)} placeholder="Rust spots, old wrap remnants, paint chips, compound curves to note..." />
        </Field>
      </Section>

      <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:8, borderTop:'1px solid var(--border)' }}>
        <button onClick={onComplete} style={{ padding:'10px 24px', borderRadius:9, fontWeight:800, fontSize:13, cursor:'pointer', background:'var(--green)', border:'none', color:'#0d1a10' }}>
          ✓ Design & Scope Complete — Next: Logistics →
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — LOGISTICS & STATUS
// ═══════════════════════════════════════════════════════════════════════════════
function Tab3({ f, ff, project, teammates, onComplete, onAdvance, onSaveOrder, profile, curStage }: any) {
  const stage = PIPE_STAGES.find(s => s.key === curStage)
  const stageIdx = PIPE_STAGES.findIndex(s => s.key === curStage)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Pipeline progress */}
      <Section label="Pipeline Stage">
        <div style={{ marginBottom: 16 }}>
          <ProgressTicks currentStage={curStage} />
        </div>
        {stage && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:`${stage.color}10`, border:`1px solid ${stage.color}30`, borderRadius:10 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text1)' }}>
              Currently in: <span style={{ color:stage.color }}>{stage.label}</span>
            </div>
            <button onClick={onAdvance} style={{ padding:'8px 18px', borderRadius:8, fontWeight:800, fontSize:12, cursor:'pointer', background:stage.color, border:'none', color:'#fff' }}>
              Advance Stage →
            </button>
          </div>
        )}
      </Section>

      {/* Schedule */}
      <Section label="Schedule & Logistics">
        <Grid cols={3}>
          <Field label="Install Date">
            <input style={inp} type="date" value={f.installDate} onChange={e=>ff('installDate',e.target.value)} />
          </Field>
          <Field label="Vehicle Drop-off / Access">
            <input style={inp} value={f.access} onChange={e=>ff('access',e.target.value)} placeholder="Drop off Monday 8am, key in lockbox..." />
          </Field>
          <Field label="Scope Confirmed With Customer">
            <input style={inp} value={f.scopeConfirm} onChange={e=>ff('scopeConfirm',e.target.value)} placeholder="Verbal, email, signed contract..." />
          </Field>
        </Grid>
        <div style={{ display:'flex', gap:20, marginTop:12 }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--text1)' }}>
            <input type="checkbox" checked={f.deposit} onChange={e=>ff('deposit',e.target.checked)} />
            Deposit Collected
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--text1)' }}>
            <input type="checkbox" checked={f.contractSigned} onChange={e=>ff('contractSigned',e.target.checked)} />
            Contract Signed
          </label>
        </div>
      </Section>

      <Section label="Notes">
        <Grid cols={2}>
          <Field label="Sales Notes">
            <textarea style={{...inp,minHeight:80}} value={f.salesNotes} onChange={e=>ff('salesNotes',e.target.value)} placeholder="Customer requests, deal context, follow-up needed..." />
          </Field>
          <Field label="Internal Production Notes">
            <textarea style={{...inp,minHeight:80}} value={f.internalNotes} onChange={e=>ff('internalNotes',e.target.value)} placeholder="Installer notes, shop info, access codes..." />
          </Field>
        </Grid>
      </Section>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:8, borderTop:'1px solid var(--border)' }}>
        <button onClick={onComplete} style={{ padding:'9px 20px', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)' }}>
          ✓ Mark Logistics Complete
        </button>
        <button onClick={onSaveOrder} style={{ padding:'10px 24px', borderRadius:9, fontWeight:800, fontSize:13, cursor:'pointer', background:'var(--accent)', border:'none', color:'#fff' }}>
          🚀 Send to Production
        </button>
      </div>
    </div>
  )
}

// ── Layout helpers ─────────────────────────────────────────────────────────────
function Section({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:900, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', paddingBottom:8, marginBottom:14, borderBottom:'1px solid var(--border)' }}>{label}</div>
      {children}
    </div>
  )
}
function Grid({ cols, children, style }: { cols:number; children:React.ReactNode; style?:React.CSSProperties }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:12, ...style }}>
      {children}
    </div>
  )
}

export default ProjectDetail