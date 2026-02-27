'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile, Project, ProjectStatus, UserRole } from '@/types'
import { canAccess } from '@/types'
import { MessageSquare, ClipboardList, Palette, Printer, Wrench, Search, DollarSign, CheckCircle, Circle, Save, Receipt, Camera, AlertTriangle, X, User, Cog, Link2, Pencil, Timer, ClipboardCheck, Package, ScanSearch, Sparkles, RefreshCw, ShoppingCart, Activity, ArrowLeft, MapPin, CloudRain, ThumbsUp, ImagePlay, Lightbulb, type LucideIcon } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'
import JobExpenses from '@/components/projects/JobExpenses'
import FloatingFinancialBar from '@/components/financial/FloatingFinancialBar'
import JobChat from '@/components/chat/JobChat'
import JobImages from '@/components/images/JobImages'
import ProgressTicks from '@/components/pipeline/ProgressTicks'
import MaterialTracking from '@/components/approval/MaterialTracking'
import QuotedVsActual from '@/components/approval/QuotedVsActual'
import InstallTimer from '@/components/install/InstallTimer'
import IntakeLinkGenerator from '@/components/customer/IntakeLinkGenerator'
import ReferralPanel from '@/components/referral/ReferralPanel'
import SendBidToInstaller from '@/components/installer/SendBidToInstaller'
import SalesTabBuilder from '@/components/projects/SalesTabBuilder'
import ProofingPanel from '@/components/projects/ProofingPanel'
import TimeTrackingTab from '@/components/projects/TimeTrackingTab'
import CustomerCommsPanel from '@/components/comms/CustomerCommsPanel'
import RenderEngine from '@/components/renders/RenderEngine'
import JobPhotosTab from '@/components/projects/JobPhotosTab'
import UpsellWidget from '@/components/projects/UpsellWidget'

interface Teammate { id: string; name: string; role: UserRole; email?: string }
interface ProjectDetailProps { profile: Profile; project: Project; teammates: Teammate[] }

// ── Constants ────────────────────────────────────────────────────
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
const PIPE_STAGES: {key:string; label:string; Icon:LucideIcon; color:string}[] = [
  {key:'sales_in',    label:'Sales',       Icon:ClipboardList, color:'#4f7fff'},
  {key:'production',  label:'Production',  Icon:Printer,       color:'#22c07a'},
  {key:'install',     label:'Install',     Icon:Wrench,        color:'#22d3ee'},
  {key:'prod_review', label:'QC Review',   Icon:Search,        color:'#f59e0b'},
  {key:'sales_close', label:'Close',       Icon:DollarSign,    color:'#8b5cf6'},
]
const SEND_BACK_REASONS: Record<string, string[]> = {
  production: ['Incorrect scope / coverage', 'Missing design files', 'Price needs adjustment', 'Customer changed specs', 'Installer not assigned', 'Other'],
  install:    ['Vinyl defect — reprint needed', 'Wrong color / material', 'Dimensions don\'t match vehicle', 'Missing panels', 'Customer postponed', 'Other'],
  prod_review:['Wrap quality issue — redo section', 'Seams not aligned', 'Bubbles / lifting detected', 'Wrong vehicle wrapped', 'Missing coverage area', 'Other'],
  sales_close:['GPM below threshold', 'Hours over budget — review', 'Customer dispute', 'Missing install photos', 'Reprint cost not logged', 'Other'],
}

const fM = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)
const fP = (n:number) => Math.round(n)+'%'
const v  = (val:any, def=0) => parseFloat(val)||def

// ── Main Component ───────────────────────────────────────────────
export function ProjectDetail({ profile, project: initial, teammates }: ProjectDetailProps) {
  const [project, setProject] = useState<Project>(initial)
  const [tab, setTab] = useState<'chat'|'sales'|'design'|'production'|'install'|'qc'|'close'|'expenses'|'purchasing'|'activity'|'time_tracking'|'renders'|'photos'>('chat')
  const [aiRecap, setAiRecap] = useState<any>(null)
  const [aiRecapLoading, setAiRecapLoading] = useState(false)
  const [showAiRecap, setShowAiRecap] = useState(false)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const { xpToast, badgeToast } = useToast()
  const [sendBackOpen, setSendBackOpen] = useState<string|null>(null)
  const [sendBackReason, setSendBackReason] = useState('')
  const [sendBackNotes, setSendBackNotes] = useState('')
  const [sendBacks, setSendBacks] = useState<any[]>([])
  const [portalToken, setPortalToken] = useState<string|null>(null)

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

  // Mobile install state
  const [isMobileInstall, setIsMobileInstall] = useState<boolean>(
    Boolean(initial.is_mobile_install)
  )
  const [installAddress, setInstallAddress] = useState<string>(
    initial.install_address || ''
  )
  const [installWeather, setInstallWeather] = useState<{
    severity: 'good' | 'medium' | 'high' | 'danger'
    issues: string[]
  } | null>(null)
  const [checkingWeather, setCheckingWeather] = useState(false)

  // Form fields — ALL sales fields in one object
  const fd = (initial.form_data as any) || {}
  const [f, setF] = useState({
    client: fd.client || initial.title || '', bizName: fd.bizName || '',
    phone: fd.phone || '', email: fd.email || '',
    vehicle: fd.vehicle || initial.vehicle_desc || '', vehicleColor: fd.vehicleColor || '',
    leadType: fd.leadType || 'inbound', agent: fd.agent || profile.name || '',
    installer: fd.installer || '', installDate: fd.installDate || initial.install_date || '',
    sqft: fd.sqft || '', matRate: fd.matRate || '2.10', margin: fd.margin || '75',
    laborPct: fd.laborPct || '10', designFee: fd.designFee || '150',
    misc: fd.misc || '0', salesPrice: fd.salesPrice || '',
    len: fd.len || '', wid: fd.wid || '8.5', hft: fd.hft || '7', hin: fd.hin || '6',
    unitPrice: fd.unitPrice || '28.35', unitQty: fd.unitQty || '',
    designNeeded: fd.designNeeded || false, designNotes: fd.designNotes || '',
    assetStatus: fd.assetStatus || '', designComm: fd.designComm || '',
    revisionNotes: fd.revisionNotes || '', driveLink: fd.driveLink || '',
    approvalStatus: fd.approvalStatus || '', brandColors: fd.brandColors || '',
    printVendor: fd.printVendor || '', coverage: fd.coverage || '',
    exclusions: fd.exclusions || '', warnings: fd.warnings || '',
    deposit: fd.deposit || false, contractSigned: fd.contractSigned || false,
    access: fd.access || '', scopeConfirm: fd.scopeConfirm || '',
    salesNotes: fd.salesNotes || '', internalNotes: fd.internalNotes || '',
    // Production sign-off fields
    linftPrinted: fd.linftPrinted || '', matWidth: fd.matWidth || '54',
    rollsUsed: fd.rollsUsed || '', matSku: fd.matSku || '', printNotes: fd.printNotes || '',
    // Install sign-off fields
    vinylOk: fd.vinylOk || false, colorMatch: fd.colorMatch || false,
    dimsCorrect: fd.dimsCorrect || false, surfacePrepped: fd.surfacePrepped || false,
    vinylNotes: fd.vinylNotes || '',
    postHeat: fd.postHeat || false, postEdges: fd.postEdges || false,
    postNoBubbles: fd.postNoBubbles || false, postSeams: fd.postSeams || false,
    postCleaned: fd.postCleaned || false, postPhotos: fd.postPhotos || false,
    actualHrs: fd.actualHrs || '', actualDate: fd.actualDate || '',
    installerSig: fd.installerSig || '', installNotes: fd.installNotes || '',
    // QC fields
    qcPass: fd.qcPass || 'pass', finalLinft: fd.finalLinft || '',
    reprintCost: fd.reprintCost || '0', qcNotes: fd.qcNotes || '',
    // Close fields
    closeNotes: fd.closeNotes || '', finalApproved: fd.finalApproved || false,
    // Expenses
    jobExpenses: fd.jobExpenses || [],
  })

  const supabase = createClient()
  const router = useRouter()
  const canEdit = canAccess(profile.role, 'edit_projects')
  const canFinance = canAccess(profile.role, 'view_financials')
  const curStageKey = project.pipe_stage || 'sales_in'

  // ── Load send-backs ────────────────────────────────────────────
  useEffect(() => {
    supabase.from('send_backs').select('*').eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSendBacks(data) })
    // Look up portal token from linked sales order
    const soId = (initial.form_data as any)?.sales_order_id
    if (soId) {
      supabase.from('sales_orders').select('portal_token').eq('id', soId).single()
        .then(({ data }) => { if (data?.portal_token) setPortalToken(data.portal_token) })
    }
  }, [project.id])

  // ── Derived financials ─────────────────────────────────────────
  const calc = useCallback(() => {
    const sqft = v(f.sqft), matRate = v(f.matRate, 2.10)
    const margin = v(f.margin, 75) / 100, laborPct = v(f.laborPct, 10) / 100
    const designFee = v(f.designFee, 150), misc = v(f.misc, 0)
    let material = 0, labor = 0, hrs = 0, sale = 0

    if (jobType === 'Commercial' && subType === 'Vehicle' && selectedVehicle) {
      material = sqft * matRate; labor = selectedVehicle.pay; hrs = selectedVehicle.hrs
      const cogs = material + labor + designFee + misc
      sale = margin > 0 ? cogs / (1 - margin) : cogs
    } else if (jobType === 'PPF' && selectedPPF) {
      material = selectedPPF.mat; labor = selectedPPF.pay; hrs = selectedPPF.hrs; sale = selectedPPF.sale
    } else if (jobType === 'Marine') {
      material = v(f.unitPrice, 28.35) * v(f.unitQty, 0)
      const cogs = material + designFee + misc
      labor = cogs * laborPct; sale = margin > 0 ? (cogs + labor) / (1 - margin) : cogs + labor
      hrs = Math.ceil(labor / 35)
    } else {
      material = sqft * matRate; const cogs = material + designFee + misc
      labor = cogs * laborPct; sale = margin > 0 ? (cogs + labor) / (1 - margin) : cogs + labor
      hrs = Math.ceil(labor / 35)
    }
    if (f.salesPrice && v(f.salesPrice) > 0) sale = v(f.salesPrice)
    const cogs = material + labor + designFee + misc
    const profit = sale - cogs, gpm = sale > 0 ? (profit / sale) * 100 : 0
    const commRate = f.leadType === 'outbound' ? 0.10 : f.leadType === 'presold' ? 0.05 : 0.075
    return { sale, material, labor, hrs, designFee, misc, cogs, profit, gpm, commission: profit * commRate }
  }, [f, jobType, subType, selectedVehicle, selectedPPF])

  const fin = calc()

  function calcSqft() {
    const l = v(f.len), w = v(f.wid), h = v(f.hft) + v(f.hin)/12
    let net = 0
    selectedSides.forEach(s => {
      if (s === 'left' || s === 'right') net += l * h
      else if (s === 'rear' || s === 'front') net += w * h
    })
    if (net > 0) setF(p => ({...p, sqft: Math.round(net).toString()}))
  }

  function ff(key: string, val: any) { setF(p => ({...p, [key]: val})) }

  // ── Save ───────────────────────────────────────────────────────
  async function save(updates: any = {}) {
    setSaving(true)
    const prevInstallDate = project.install_date
    const formData = { ...f, jobType, subType, wrapDetail, selectedVehicle, selectedPPF,
                       selectedSides: Array.from(selectedSides) }
    const { error } = await supabase.from('projects').update({
      title: f.client || project.title, vehicle_desc: f.vehicle,
      install_date: f.installDate || null, revenue: fin.sale || null,
      profit: fin.profit || null, gpm: fin.gpm || null, commission: fin.commission || null,
      form_data: formData, fin_data: fin, updated_at: new Date().toISOString(), ...updates,
    }).eq('id', project.id)
    setSaving(false)
    if (!error) {
      setProject(p => ({...p, ...updates}))
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      // Auto-create appointment when install_date is newly set
      const newDate = f.installDate || null
      if (newDate && newDate !== prevInstallDate) {
        supabase.from('appointments').insert({
          org_id: project.org_id,
          title: `Install Drop-off - ${f.client || project.title || 'Customer'}`,
          customer_name: f.client || project.title || 'Customer',
          appointment_type: 'Install Drop-off',
          start_time: `${newDate}T09:00:00`,
          end_time: `${newDate}T10:00:00`,
          duration_minutes: 60,
          assigned_to: project.installer_id || null,
          project_id: project.id,
          status: 'pending',
          source: 'internal',
          notes: `Auto-created from job: ${project.title || f.client || project.id}`,
        })
      }
    }
  }

  // ── Mobile install handlers ─────────────────────────────────────
  async function toggleMobileInstall() {
    const newVal = !isMobileInstall
    setIsMobileInstall(newVal)
    const { error } = await supabase.from('projects').update({ is_mobile_install: newVal }).eq('id', project.id)
    if (error) {
      setIsMobileInstall(!newVal) // revert on failure
      setToast('Failed to save mobile install setting')
    }
  }

  async function saveInstallAddress() {
    if (!installAddress.trim()) return
    setCheckingWeather(true)
    setInstallWeather(null)
    try {
      // Geocode the address
      const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(installAddress)}`)
      const geo = await geoRes.json()
      const lat: number = geo.lat || 47.3318
      const lng: number = geo.lng || -122.5793

      // Save address + coords to DB
      await supabase.from('projects').update({
        install_address: installAddress,
        install_lat: lat,
        install_lng: lng,
      }).eq('id', project.id)

      // Fetch 7-day weather for this location
      const weatherRes = await fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      if (!weatherRes.ok) throw new Error('Weather fetch failed')
      const weatherData = await weatherRes.json()

      // Find the day matching the install date
      const installDate = f.installDate
      if (installDate && weatherData.daily?.time) {
        const dayIndex: number = weatherData.daily.time.findIndex((d: string) => d === installDate)
        if (dayIndex >= 0) {
          const code: number = weatherData.daily.weathercode[dayIndex]
          const maxTemp: number = weatherData.daily.temperature_2m_max[dayIndex]
          const minTemp: number = weatherData.daily.temperature_2m_min[dayIndex]
          const precip: number = weatherData.daily.precipitation_sum[dayIndex]
          const wind: number = weatherData.daily.windspeed_10m_max[dayIndex]
          const precipProb: number = weatherData.daily.precipitation_probability_max[dayIndex]

          const issues: string[] = []
          if (precipProb > 40 || precip > 0.1) issues.push(`Rain expected (${precipProb}% chance, ${precip.toFixed(2)}" precip)`)
          if (minTemp < 50) issues.push(`Too cold for vinyl (low: ${minTemp}°F — vinyl needs 50°F+)`)
          if (maxTemp > 95) issues.push(`Too hot for vinyl application (${maxTemp}°F)`)
          if (wind > 20) issues.push(`High winds (${wind} mph — makes install very difficult)`)
          if (code >= 95) issues.push('Thunderstorm forecast — DO NOT install')

          const severity: 'good' | 'medium' | 'high' | 'danger' =
            issues.length === 0 ? 'good' :
            code >= 95 ? 'danger' :
            (precip > 0.1 || minTemp < 50) ? 'high' : 'medium'

          setInstallWeather({ severity, issues })

          if (issues.length > 0) {
            await supabase.from('projects').update({
              weather_alerts: [{ severity, issues, install_date: installDate }],
              last_weather_check: new Date().toISOString(),
            }).eq('id', project.id)
          } else {
            await supabase.from('projects').update({
              weather_alerts: [],
              last_weather_check: new Date().toISOString(),
            }).eq('id', project.id)
          }
        } else {
          // Install date is beyond 7-day forecast window
          setInstallWeather({ severity: 'good', issues: [] })
        }
      } else {
        // No install date set yet — just saved the address
        setInstallWeather(null)
      }
    } catch {
      setToast('Weather check failed — address saved')
    }
    setCheckingWeather(false)
  }

  // ── Pipeline advance with gate check ───────────────────────────
  async function advanceStage() {
    const order = ['sales_in','production','install','prod_review','sales_close']
    const idx = order.indexOf(curStageKey)
    if (idx < 0 || idx >= order.length - 1) return

    // Gate checks
    if (curStageKey === 'sales_in') {
      if (!f.client) { showToast('Client name required'); return }
      if (!f.installer && !f.vehicle) { showToast('Assign installer or enter vehicle'); return }
    }
    if (curStageKey === 'production') {
      if (!f.linftPrinted) { showToast('Log linear feet printed before advancing'); return }
    }
    if (curStageKey === 'install') {
      if (!f.actualHrs) { showToast('Log actual install hours'); return }
      if (!f.installerSig) { showToast('Installer signature required'); return }
    }
    if (curStageKey === 'prod_review') {
      if (f.qcPass === 'reprint' && !v(f.reprintCost)) { showToast('Enter reprint cost'); return }
    }

    const next = order[idx + 1]
    const newStatus = next === 'done' ? 'closed' as ProjectStatus : project.status
    await save({ pipe_stage: next, status: newStatus })

    // Log stage approval
    await supabase.from('stage_approvals').insert({
      project_id: project.id, org_id: project.org_id,
      stage: curStageKey, approved_by: profile.id,
      notes: `Advanced to ${next}`, checklist: f,
    })

    // Log to activity log
    fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, action: 'stage_advanced', details: { from_stage: curStageKey, to_stage: next } }),
    }).catch((error) => { console.error(error); })

    // Fire integrations webhook (GHL, Slack)
    fetch('/api/webhooks/stage-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, event: 'stage_advanced', from_stage: curStageKey, to_stage: next }),
    }).catch((error) => { console.error(error); })

    // Auto-create stage tasks
    fetch('/api/tasks/auto-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, to_stage: next, project_title: project.title }),
    }).catch((error) => { console.error(error); })

    // Award XP for key milestones
    const xpAction = curStageKey === 'install'      ? 'install_completed'
                   : curStageKey === 'production'   ? 'print_job_completed'
                   : curStageKey === 'prod_review'  ? 'customer_signoff'
                   : null
    if (xpAction) {
      const stageLabel = curStageKey === 'install' ? 'Install complete'
        : curStageKey === 'production' ? 'Print job done'
        : 'Customer signed off'
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: xpAction, sourceType: 'project', sourceId: project.id }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
          if (res?.amount) xpToast(res.amount, stageLabel, res.leveledUp, res.newLevel)
          if (res?.newBadges?.length) badgeToast(res.newBadges)
        })
        .catch((error) => { console.error(error); })
    }

    showToast(`Moved to ${PIPE_STAGES.find(s=>s.key===next)?.label || 'Done'}`)
  }

  // ── Close job ──────────────────────────────────────────────────
  async function closeJob() {
    if (!f.finalApproved) { showToast('Check the final approval box'); return }
    await save({ pipe_stage: 'done', status: 'closed' as ProjectStatus })
    await supabase.from('stage_approvals').insert({
      project_id: project.id, org_id: project.org_id,
      stage: 'sales_close', approved_by: profile.id,
      notes: f.closeNotes || 'Job closed', checklist: f,
    })
    // Award deal_won XP
    fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deal_won', sourceType: 'project', sourceId: project.id }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number } | null) => {
        if (res?.amount) xpToast(res.amount, 'Deal closed!', res.leveledUp, res.newLevel)
      })
      .catch((error) => { console.error(error); })
    // Fire integrations webhook
    fetch('/api/webhooks/stage-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, event: 'job_closed' }),
    }).catch((error) => { console.error(error); })
    // Log activity
    fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, action: 'job_closed', details: { notes: f.closeNotes } }),
    }).catch((error) => { console.error(error); })
    showToast('Job Closed & Approved!')
  }

  // ── Send back ──────────────────────────────────────────────────
  async function confirmSendBack() {
    if (!sendBackOpen || !sendBackReason) return
    const order = ['sales_in','production','install','prod_review','sales_close']
    const idx = order.indexOf(curStageKey)
    const prevStage = idx > 0 ? order[idx - 1] : 'sales_in'

    await supabase.from('send_backs').insert({
      project_id: project.id, org_id: project.org_id,
      from_stage: curStageKey, to_stage: prevStage,
      reason: sendBackReason, notes: sendBackNotes, created_by: profile.id,
    })
    await save({ pipe_stage: prevStage })
    setSendBacks(prev => [{ from_stage: curStageKey, to_stage: prevStage, reason: sendBackReason, notes: sendBackNotes, created_at: new Date().toISOString() }, ...prev])
    // Log to activity log
    fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, action: 'stage_sent_back', details: { from_stage: curStageKey, to_stage: prevStage, reason: sendBackReason } }),
    }).catch((error) => { console.error(error); })

    // Fire integrations webhook (Slack)
    fetch('/api/webhooks/stage-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, event: 'send_back', from_stage: curStageKey, to_stage: prevStage, reason: sendBackReason }),
    }).catch((error) => { console.error(error); })
    setSendBackOpen(null); setSendBackReason(''); setSendBackNotes('')
    showToast(`Sent back to ${PIPE_STAGES.find(s=>s.key===prevStage)?.label}`)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // ── AI Recap ────────────────────────────────────────────────────
  async function fetchAiRecap() {
    setAiRecapLoading(true)
    setShowAiRecap(true)
    try {
      const res = await fetch('/api/ai/job-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, project }),
      })
      const data = await res.json()
      if (data.recap) setAiRecap(data.recap)
    } catch {}
    setAiRecapLoading(false)
  }

  // ── Financial bar data ─────────────────────────────────────────
  const financialProject = {
    revenue: fin.sale, profit: fin.profit, gpm: fin.gpm, commission: fin.commission,
    fin_data: { material_cost: fin.material, labor_cost: fin.labor, design_fee: fin.designFee,
      cogs: fin.cogs, install_pay: fin.labor, hrs_budget: fin.hrs,
      material_sqft: v(f.sqft), labor_pct: v(f.laborPct, 10),
      comm_base: 4.5, comm_inbound: f.leadType === 'inbound' ? 1 : 0,
      comm_gpm_bonus: fin.gpm > 73 ? 2 : 0 }
  }

  // ── Tab config ─────────────────────────────────────────────────
  const TABS: {key: typeof tab; label: string; Icon: LucideIcon; stageKey?: string}[] = [
    { key: 'chat',       label: 'Chat',       Icon: MessageSquare },
    { key: 'sales',      label: 'Sales',      Icon: ClipboardList, stageKey: 'sales_in' },
    { key: 'design',     label: 'Design',     Icon: Palette },
    { key: 'production', label: 'Production', Icon: Printer, stageKey: 'production' },
    { key: 'install',    label: 'Install',    Icon: Wrench, stageKey: 'install' },
    { key: 'qc',         label: 'QC',         Icon: Search, stageKey: 'prod_review' },
    { key: 'close',      label: 'Close',      Icon: DollarSign, stageKey: 'sales_close' },
    { key: 'renders',    label: 'Renders',    Icon: ImagePlay },
    { key: 'photos',     label: 'Photos',     Icon: Camera },
    { key: 'expenses',   label: 'Expenses',   Icon: Receipt },
    { key: 'purchasing', label: 'Purchasing', Icon: ShoppingCart },
    { key: 'activity',   label: 'Activity',   Icon: Activity },
    { key: 'time_tracking', label: 'Time', Icon: Timer },
  ]

  const stageOrder = ['sales_in','production','install','prod_review','sales_close']
  const curIdx = stageOrder.indexOf(curStageKey)
  const latestSendBack = sendBacks[0]

  // ── Race track checklist data ─────────────────────────────────
  const isDoneJob = project.pipe_stage === 'done'
  const checklistByStage: Record<string, {label: string; done: boolean}[]> = {
    sales_in: [
      { label: 'Client name',       done: !!f.client },
      { label: 'Vehicle info',      done: !!f.vehicle },
      { label: 'Installer assigned',done: !!f.installer },
      { label: 'Deposit collected', done: !!f.deposit },
      { label: 'Contract signed',   done: !!f.contractSigned },
    ],
    production: [
      { label: 'Linear ft printed', done: !!f.linftPrinted },
      { label: 'Material SKU',      done: !!f.matSku },
      { label: 'Roll count',        done: !!f.rollsUsed },
      { label: 'Print notes',       done: !!f.printNotes },
    ],
    install: [
      { label: 'Vinyl inspection',  done: !!(f.vinylOk && f.colorMatch && f.dimsCorrect) },
      { label: 'Surface prepped',   done: !!f.surfacePrepped },
      { label: 'Post-app checks',   done: !!(f.postHeat && f.postEdges && f.postNoBubbles && f.postSeams) },
      { label: 'Actual hours',      done: !!f.actualHrs },
      { label: 'Installer signed',  done: !!f.installerSig },
    ],
    prod_review: [
      { label: 'QC decision',       done: !!f.qcPass },
      { label: 'Reprint cost',      done: f.qcPass !== 'reprint' || v(f.reprintCost) > 0 },
      { label: 'QC notes',          done: !!f.qcNotes },
    ],
    sales_close: [
      { label: 'Final approved',    done: !!f.finalApproved },
      { label: 'Close notes',       done: !!f.closeNotes },
    ],
  }
  const allCheckItems = Object.values(checklistByStage).flat()
  const totalCheckItems = allCheckItems.length
  const totalCheckDone  = isDoneJob ? totalCheckItems : allCheckItems.filter(i => i.done).length
  const totalCheckPct   = totalCheckItems > 0 ? Math.round((totalCheckDone / totalCheckItems) * 100) : 0

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {toast && (
        <div style={{ position:'fixed', bottom:20, right:20, background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:14, padding:'14px 22px', fontSize:13, fontWeight:700, color:'var(--text1)', zIndex:9999, boxShadow:'0 12px 40px rgba(0,0,0,.5)', backdropFilter:'blur(12px)', animation:'fadeUp .2s ease' }}>
          {toast}
        </div>
      )}

      {/* Send Back Modal */}
      {sendBackOpen && (
        <div className="drawer-overlay" onClick={() => setSendBackOpen(null)}>
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:18, padding:28, width:480, maxHeight:'80vh', overflow:'auto', animation:'fadeUp .2s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:18, fontWeight:800, color:'var(--red)', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}><AlertTriangle size={18} /> Send Back from {PIPE_STAGES.find(s=>s.key===curStageKey)?.label}</div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:8 }}>Select Reason</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
              {(SEND_BACK_REASONS[curStageKey] || SEND_BACK_REASONS.production).map(r => (
                <button key={r} onClick={() => setSendBackReason(r)} style={{
                  padding:'10px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', textAlign:'left',
                  background: sendBackReason === r ? 'rgba(242,90,90,.15)' : 'var(--surface2)',
                  border: `1px solid ${sendBackReason === r ? 'rgba(242,90,90,.5)' : 'var(--border)'}`,
                  color: sendBackReason === r ? 'var(--red)' : 'var(--text2)',
                }}>{r}</button>
              ))}
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:6 }}>Notes (optional)</div>
              <textarea value={sendBackNotes} onChange={e => setSendBackNotes(e.target.value)} placeholder="Additional details..."
                style={{ width:'100%', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', fontSize:13, color:'var(--text1)', outline:'none', minHeight:60 }} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setSendBackOpen(null)} style={{ flex:1, padding:'10px', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)' }}>Cancel</button>
              <button onClick={confirmSendBack} disabled={!sendBackReason} style={{ flex:1, padding:'10px', borderRadius:9, fontWeight:800, fontSize:13, cursor:'pointer', background:'var(--red)', border:'none', color:'#fff', opacity: sendBackReason ? 1 : 0.4 }}>Confirm Send Back</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg, var(--card-bg) 0%, rgba(79,127,255,0.04) 100%)', border:'1px solid var(--card-border)', borderRadius:20, padding:'20px 24px', marginBottom:16, position:'relative', overflow:'hidden' }}>
        {/* Accent line top */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${PIPE_STAGES.find(s=>s.key===curStageKey)?.color || 'var(--accent)'}, transparent)`, opacity:0.6 }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'var(--surface2)', border:'1px solid var(--card-border)', borderRadius:10, padding:'8px 16px', fontSize:12, fontWeight:700, color:'var(--text2)', cursor:'pointer', transition:'all 0.15s' }}>
            <ArrowLeft size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />Back
          </button>
          <div>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:24, fontWeight:900, color:'var(--text1)', lineHeight:1 }}>{f.client || 'Untitled Job'}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:3, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontFamily:'JetBrains Mono, monospace' }}>#{project.id.slice(-8)}</span>
              <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--text3)', display:'inline-block' }} />
              <span>{f.vehicle || 'No vehicle'}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {PIPE_STAGES.find(s => s.key === curStageKey) && (
            <div style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:800, background:`${PIPE_STAGES.find(s => s.key === curStageKey)!.color}18`, color: PIPE_STAGES.find(s => s.key === curStageKey)!.color, border:`1px solid ${PIPE_STAGES.find(s => s.key === curStageKey)!.color}40` }}>
              {(() => { const ps = PIPE_STAGES.find(s => s.key === curStageKey)!; return <><ps.Icon size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />{ps.label}</>})()}
            </div>
          )}
          <button onClick={fetchAiRecap} disabled={aiRecapLoading} title="AI Job Recap" style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(79,127,255,.15)', color:'var(--accent)', border:'1px solid rgba(79,127,255,.3)', borderRadius:9, padding:'8px 14px', fontWeight:700, fontSize:12, cursor:'pointer' }}>
            <Sparkles size={14} />{aiRecapLoading ? 'Analyzing…' : 'AI Recap'}
          </button>
          <button
            onClick={async () => {
              const token = portalToken || project.id
              const link = `${window.location.origin}/portal/quote/${token}`
              try { await navigator.clipboard.writeText(link); setToast('Customer portal link copied!') } catch { setToast(link) }
              setTimeout(() => setToast(''), 3000)
            }}
            title="Copy customer portal link"
            style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(34,211,238,.12)', border:'1px solid rgba(34,211,238,.3)', borderRadius:9, padding:'8px 14px', fontWeight:700, fontSize:12, cursor:'pointer', color:'#22d3ee' }}
          >
            <Link2 size={14} /> Customer Portal
          </button>
          <div style={{ position:'relative' }} className="pdf-menu-container">
            <button
              onClick={() => setShowPdfMenu(m => !m)}
              title="Print Job Packet"
              style={{ display:'flex', alignItems:'center', gap:5, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, padding:'8px 14px', fontWeight:700, fontSize:12, cursor:'pointer', color:'var(--text1)' }}
            >
              <Printer size={14} /> Print
            </button>
            {showPdfMenu && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 4px)', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:6, minWidth:200, zIndex:100, boxShadow:'0 8px 32px rgba(0,0,0,.4)' }}>
                <button onClick={() => { setShowPdfMenu(false); window.location.href=`/api/pdf/job-packet/${project.id}` }} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', borderRadius:7, fontSize:12, fontWeight:600, background:'none', border:'none', color:'var(--text1)', cursor:'pointer', textAlign:'left' }}>
                  <Printer size={13} /> Print Job Packet (All)
                </button>
                <button onClick={() => { setShowPdfMenu(false); window.location.href=`/api/pdf/job-packet/${project.id}?section=production` }} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', borderRadius:7, fontSize:12, fontWeight:600, background:'none', border:'none', color:'var(--text1)', cursor:'pointer', textAlign:'left' }}>
                  <Printer size={13} /> Production Brief Only
                </button>
                <button onClick={() => { setShowPdfMenu(false); window.location.href=`/api/pdf/job-packet/${project.id}?section=install` }} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', borderRadius:7, fontSize:12, fontWeight:600, background:'none', border:'none', color:'var(--text1)', cursor:'pointer', textAlign:'left' }}>
                  <Printer size={13} /> Install Order Only
                </button>
              </div>
            )}
          </div>
          <button onClick={() => save()} disabled={saving} style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:12, padding:'9px 20px', fontWeight:800, fontSize:13, cursor:'pointer', opacity:saving?.6:1, boxShadow:'0 2px 12px rgba(79,127,255,0.25)', transition:'all 0.15s' }}>
            {saving ? 'Saving…' : saved ? <><CheckCircle size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />Saved</> : <><Save size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />Save</>}
          </button>
        </div>
      </div>
      </div>

      {/* ── AI RECAP PANEL ────────────────────────────── */}
      {showAiRecap && (
        <div style={{ background:'rgba(79,127,255,.04)', border:'1px solid rgba(79,127,255,.2)', borderRadius:16, padding:18, marginBottom:12, animation:'fadeUp .2s ease' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:aiRecapLoading?0:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Sparkles size={16} color="var(--accent)" />
              <span style={{ fontSize:13, fontWeight:800, color:'var(--accent)' }}>AI Job Recap</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={fetchAiRecap} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:11 }}><RefreshCw size={12} />Refresh</button>
              <button onClick={() => setShowAiRecap(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}><X size={14} /></button>
            </div>
          </div>
          {aiRecapLoading && <div style={{ fontSize:12, color:'var(--text3)', animation:'pulse 1s infinite' }}>Analyzing job data…</div>}
          {!aiRecapLoading && aiRecap && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ gridColumn:'1/-1', padding:12, background:'var(--surface)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:4 }}>Summary</div>
                <div style={{ fontSize:13, color:'var(--text1)', lineHeight:1.5 }}>{aiRecap.summary}</div>
              </div>
              <div style={{ padding:12, background:'var(--surface)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:4 }}>Next Action</div>
                <div style={{ fontSize:12, color:'var(--green)', fontWeight:700 }}>{aiRecap.next_best_action}</div>
              </div>
              <div style={{ padding:12, background:'var(--surface)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:4 }}>Who Needs to Act</div>
                <div style={{ fontSize:12, color:'var(--cyan)', fontWeight:700 }}>{aiRecap.who_needs_to_respond}</div>
              </div>
              {aiRecap.blockers?.length > 0 && (
                <div style={{ gridColumn:'1/-1', padding:12, background:'rgba(242,90,90,.06)', borderRadius:8, border:'1px solid rgba(242,90,90,.2)' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--red)', textTransform:'uppercase', marginBottom:4 }}>Blockers</div>
                  {aiRecap.blockers.map((b: string, i: number) => <div key={i} style={{ fontSize:12, color:'var(--text2)', marginBottom:2 }}>• {b}</div>)}
                </div>
              )}
              {aiRecap.draft_customer_message && (
                <div style={{ gridColumn:'1/-1', padding:12, background:'rgba(34,211,238,.06)', borderRadius:8, border:'1px solid rgba(34,211,238,.2)' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--cyan)', textTransform:'uppercase', marginBottom:4 }}>Suggested Customer Message</div>
                  <div style={{ fontSize:12, color:'var(--text2)', fontStyle:'italic', lineHeight:1.5 }}>"{aiRecap.draft_customer_message}"</div>
                </div>
              )}
              <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background: aiRecap.health === 'green' ? 'var(--green)' : aiRecap.health === 'red' ? 'var(--red)' : 'var(--amber)' }} />
                <span style={{ fontSize:11, color:'var(--text3)' }}>{aiRecap.health_reason}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RACE TRACK MASTER CHECKLIST ─────────────────── */}
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:16, padding:'16px 20px 14px', marginBottom:12, position:'relative', overflow:'hidden' }}>
        {/* Speed-stripe top accent */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg, #4f7fff 0%, #22c07a 30%, #22d3ee 55%, #f59e0b 78%, #8b5cf6 100%)', opacity:0.8 }} />

        {/* Header row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:15, lineHeight:1 }}>🏎</span>
            <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:12, fontWeight:900, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.12em' }}>Job Race Track</span>
            {isDoneJob && <span style={{ fontSize:10, fontWeight:800, color:'#22c07a', background:'rgba(34,192,122,.12)', border:'1px solid rgba(34,192,122,.3)', borderRadius:6, padding:'2px 8px', letterSpacing:'.05em' }}>FINISHED 🏆</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'JetBrains Mono, monospace' }}>{totalCheckDone}/{totalCheckItems}</span>
            <div style={{ width:110, height:5, borderRadius:3, background:'var(--surface2)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, background:`linear-gradient(90deg, #4f7fff, #22c07a)`, width:`${totalCheckPct}%`, transition:'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize:10, fontWeight:800, fontFamily:'JetBrains Mono, monospace', color: totalCheckPct === 100 ? '#22c07a' : 'var(--accent)', minWidth:32 }}>{totalCheckPct}%</span>
          </div>
        </div>

        {/* Track + nodes */}
        <div style={{ position:'relative' }}>
          {/* Asphalt road strip */}
          <div style={{ position:'absolute', left:30, right:30, top:27, height:9, borderRadius:4, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', overflow:'hidden' }}>
            {/* Dashed center lane marking */}
            <div style={{ position:'absolute', top:'50%', left:0, right:0, height:0, borderTop:'2px dashed rgba(255,255,255,.10)', transform:'translateY(-50%)' }} />
            {/* Completion fill */}
            <div style={{ position:'absolute', top:0, left:0, bottom:0, borderRadius:4, background:'linear-gradient(90deg, rgba(34,192,122,.45), rgba(79,127,255,.45))', width: isDoneJob ? '100%' : curIdx > 0 ? `${(curIdx / (PIPE_STAGES.length - 1)) * 100}%` : '0%', transition:'width 0.7s ease' }} />
          </div>

          {/* Stage nodes */}
          <div style={{ display:'flex', justifyContent:'space-between', position:'relative', zIndex:1 }}>
            {PIPE_STAGES.map((s, i) => {
              const stageIdx = stageOrder.indexOf(s.key)
              const isDone    = isDoneJob || stageIdx < curIdx
              const isActive  = !isDoneJob && s.key === curStageKey
              const isFuture  = !isDone && !isActive
              const items     = checklistByStage[s.key] || []
              const doneCount = isDone ? items.length : items.filter(it => it.done).length
              const remaining = items.length - doneCount
              return (
                <div key={s.key} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 }}>
                  {/* Car / finish indicator */}
                  <div style={{ height:20, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {isActive && <span style={{ fontSize:17, filter:`drop-shadow(0 0 8px ${s.color})` }}>🏎</span>}
                    {isDoneJob && i === PIPE_STAGES.length - 1 && <span style={{ fontSize:17 }}>🏆</span>}
                  </div>

                  {/* Stage circle */}
                  <div style={{ width:46, height:46, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: isDone ? 'rgba(34,192,122,.12)' : isActive ? `${s.color}12` : 'rgba(255,255,255,.02)', border:`2.5px solid ${isDone ? '#22c07a' : isActive ? s.color : 'rgba(255,255,255,.07)'}`, boxShadow: isActive ? `0 0 0 4px ${s.color}18, 0 0 18px ${s.color}30` : isDone ? '0 0 10px rgba(34,192,122,.25)' : 'none', transition:'all 0.3s' }}>
                    {isDone
                      ? <CheckCircle size={20} color="#22c07a" />
                      : <s.Icon size={18} color={isActive ? s.color : 'var(--text3)'} style={{ opacity: isFuture ? 0.28 : 1 }} />}
                  </div>

                  {/* Stage label */}
                  <div style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'.05em', color: isDone ? '#22c07a' : isActive ? s.color : 'var(--text3)', opacity: isFuture ? 0.4 : 1, textAlign:'center' }}>
                    {s.label}
                  </div>

                  {/* Checklist card */}
                  <div style={{ width:'100%', maxWidth:104 }}>
                    {/* Count pill */}
                    <div style={{ textAlign:'center', marginBottom:3 }}>
                      <span style={{ fontSize:9, fontWeight:800, fontFamily:'JetBrains Mono, monospace', color: isDone ? '#22c07a' : remaining > 0 && isActive ? 'var(--amber)' : 'var(--text3)', opacity: isFuture ? 0.35 : 1 }}>
                        {isDone ? '✓ done' : `${doneCount}/${items.length}`}
                      </span>
                    </div>
                    {/* Item list — full for done/current, count-only for future */}
                    {!isFuture && items.map((item, j) => (
                      <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:3, marginBottom:2 }}>
                        <div style={{ width:4, height:4, borderRadius:'50%', marginTop:4, flexShrink:0, background: item.done ? '#22c07a' : isActive ? '#f25a5a' : 'var(--text3)', opacity: item.done ? 0.65 : 1 }} />
                        <span style={{ fontSize:7.5, lineHeight:1.35, color: item.done ? 'var(--text3)' : 'var(--text1)', textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.55 : 1 }}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                    {isFuture && items.length > 0 && (
                      <div style={{ textAlign:'center', fontSize:8, color:'var(--text3)', opacity:0.3 }}>{items.length} ahead</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Send-back alert banner */}
      {latestSendBack && stageOrder.indexOf(latestSendBack.to_stage) >= curIdx && (
        <div style={{ background:'rgba(242,90,90,.08)', border:'1px solid rgba(242,90,90,.3)', borderRadius:14, padding:'14px 18px', marginBottom:12, display:'flex', alignItems:'center', gap:14, animation:'fadeUp .2s ease' }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(242,90,90,.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <AlertTriangle size={18} color="var(--red)" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:900, color:'var(--red)', textTransform:'uppercase', letterSpacing:'.07em' }}>SENT BACK — NEEDS ACTION</div>
            <div style={{ fontSize:13, color:'var(--text1)', fontWeight:700, marginTop:3 }}>{latestSendBack.reason}</div>
            {latestSendBack.notes && <div style={{ fontSize:11, color:'var(--text2)', marginTop:2, fontStyle:'italic' }}>"{latestSendBack.notes}"</div>}
          </div>
        </div>
      )}

      {/* ── FINANCIAL BAR ─────────────────────────────── */}
      {canFinance && (
        <div style={{ marginBottom:12 }}>
          <FloatingFinancialBar project={financialProject} />
        </div>
      )}

      {/* ── TABS ──────────────────────────────────────── */}
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:18, overflow:'hidden' }}>
        <div style={{ display:'flex', gap:2, padding:'8px 10px', overflowX:'auto', background:'var(--surface2)', borderBottom:'1px solid var(--card-border)' }}>
          {TABS.map(t => {
            const isActive = tab === t.key
            const stageIdx = t.stageKey ? stageOrder.indexOf(t.stageKey) : -1
            const isDone = stageIdx >= 0 && stageIdx < curIdx
            const isCurrent = t.stageKey === curStageKey
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
                fontSize:12, fontWeight:700, cursor:'pointer', border:'none',
                borderRadius:10, whiteSpace:'nowrap', transition:'all 0.15s',
                background: isActive ? 'var(--card-bg)' : 'transparent',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                color: isActive ? 'var(--accent)' : isDone ? '#22c07a' : isCurrent ? 'var(--text1)' : 'var(--text3)',
              }}>
                {isDone ? <CheckCircle size={14} /> : <t.Icon size={14} />}
                {t.label}
                {isCurrent && !isDone && <span style={{ width:5, height:5, borderRadius:'50%', background: PIPE_STAGES.find(s=>s.key===curStageKey)?.color || 'var(--accent)', boxShadow:`0 0 6px ${PIPE_STAGES.find(s=>s.key===curStageKey)?.color || 'var(--accent)'}` }} />}
              </button>
            )
          })}
        </div>

        <div style={{ padding:24 }}>
          {/* ═══ CHAT TAB ═══ */}
          {tab === 'chat' && (
            <div>
              <div style={{ marginBottom:16 }}>
                <JobChat projectId={project.id} orgId={project.org_id} currentUserId={profile.id} currentUserName={profile.name} />
              </div>
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:900, color:'var(--text3)', textTransform:'uppercase', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><Camera size={12} /> Job Photos</div>
                <JobImages projectId={project.id} orgId={project.org_id} currentUserId={profile.id} vehicleType={(project.form_data as any)?.selectedVehicle?.name || ''} wrapScope={(project.form_data as any)?.wrapDetail || ''} />
              </div>
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:16 }}>
                <CustomerCommsPanel
                  customerId={(project.form_data as any)?.customerId || project.customer_id || null}
                  projectId={project.id}
                  customerPhone={(project.form_data as any)?.phone || null}
                  customerEmail={(project.form_data as any)?.email || null}
                  customerName={(project.form_data as any)?.client || project.title || 'Customer'}
                />
              </div>
            </div>
          )}

          {/* ═══ SALES TAB ═══ */}
          {tab === 'sales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SalesTabBuilder profile={profile} project={project} teammates={teammates} />
              <UpsellWidget
                projectId={project.id}
                serviceType={(project.form_data as any)?.serviceType || (project.form_data as any)?.wrapDetail?.toLowerCase().replace(/ /g,'_')}
                estimateId={(project.form_data as any)?.estimateId}
              />
            </div>
          )}

          {/* ═══ DESIGN TAB ═══ */}
          {tab === 'design' && (
            <DesignTab f={f} ff={ff} project={project} profile={profile} />
          )}

          {/* ═══ PRODUCTION TAB ═══ */}
          {tab === 'production' && (
            <ProductionTab f={f} ff={ff} project={project} profile={profile} />
          )}

          {/* ═══ INSTALL TAB ═══ */}
          {tab === 'install' && (
            <InstallTab f={f} ff={ff} project={project} profile={profile} teammates={teammates} />
          )}

          {/* ═══ QC TAB ═══ */}
          {tab === 'qc' && (
            <QCTab f={f} ff={ff} fin={fin} project={project} profile={profile} />
          )}

          {/* ═══ CLOSE TAB ═══ */}
          {tab === 'close' && (
            <CloseTab f={f} ff={ff} fin={fin} project={project} profile={profile} sendBacks={sendBacks} teammates={teammates} />
          )}

          {/* ═══ EXPENSES TAB ═══ */}
          {tab === 'expenses' && (
            <JobExpenses projectId={project.id} orgId={project.org_id} currentUserId={profile.id} />
          )}

          {/* ═══ PURCHASING TAB ═══ */}
          {tab === 'purchasing' && (
            <PurchasingTab projectId={project.id} orgId={project.org_id} project={project} />
          )}

          {/* ═══ ACTIVITY TAB ═══ */}
          {tab === 'activity' && (
            <ActivityLogTab projectId={project.id} />
          )}

          {/* ═══ TIME TRACKING TAB ═══ */}
          {tab === 'time_tracking' && (
            <TimeTrackingTab
              projectId={project.id}
              revenue={project.revenue || 0}
              materialCost={project.fin_data?.material || 0}
            />
          )}

          {/* ═══ RENDERS TAB ═══ */}
          {tab === 'renders' && (
            <RenderEngine
              jobId={project.id}
              orgId={project.org_id}
              wrapDescription={(project.form_data as any)?.wrapDetail ? `${(project.form_data as any)?.vehicle || ''} ${(project.form_data as any)?.wrapDetail || ''}`.trim() : (project.form_data as any)?.vehicle || ''}
              vehicleType={(project.form_data as any)?.selectedVehicle?.name || (project.form_data as any)?.vehicle || ''}
            />
          )}

          {/* ═══ PHOTOS TAB ═══ */}
          {tab === 'photos' && (
            <JobPhotosTab
              projectId={project.id}
              orgId={project.org_id}
              currentUserId={profile.id}
            />
          )}

          {/* ── Stage Action Bar ──────────────────────────── */}
          {tab !== 'chat' && tab !== 'design' && tab !== 'expenses' && tab !== 'purchasing' && tab !== 'activity' && tab !== 'time_tracking' && tab !== 'renders' && tab !== 'photos' && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:24, paddingTop:18, borderTop:'1px solid var(--card-border)' }}>
              <div>
                {curStageKey !== 'sales_in' && (
                  <button onClick={() => setSendBackOpen(curStageKey)} style={{ padding:'10px 20px', borderRadius:12, fontWeight:700, fontSize:12, cursor:'pointer', background:'rgba(242,90,90,.08)', border:'1px solid rgba(242,90,90,.25)', color:'var(--red)', transition:'all 0.15s', display:'flex', alignItems:'center', gap:6 }}>
                    <AlertTriangle size={13} /> Send Back
                  </button>
                )}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => save()} style={{ padding:'10px 20px', borderRadius:12, fontWeight:700, fontSize:13, cursor:'pointer', background:'var(--surface2)', border:'1px solid var(--card-border)', color:'var(--text2)', transition:'all 0.15s' }}>
                  <Save size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} />Save Progress
                </button>
                {tab === 'close' ? (
                  <button onClick={closeJob} style={{ padding:'11px 28px', borderRadius:12, fontWeight:800, fontSize:13, cursor:'pointer', background:'linear-gradient(135deg, #8b5cf6, #7c3aed)', border:'none', color:'#fff', boxShadow:'0 4px 16px rgba(139,92,246,0.3)', transition:'all 0.15s' }}>
                    <CheckCircle size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} />Close & Approve Job
                  </button>
                ) : (
                  <button onClick={advanceStage} style={{ padding:'11px 28px', borderRadius:12, fontWeight:800, fontSize:13, cursor:'pointer', background:`linear-gradient(135deg, ${PIPE_STAGES.find(s=>s.key===curStageKey)?.color || 'var(--accent)'}, ${PIPE_STAGES.find(s=>s.key===curStageKey)?.color || 'var(--accent)'}dd)`, border:'none', color:'#fff', boxShadow:`0 4px 16px ${PIPE_STAGES.find(s=>s.key===curStageKey)?.color || 'var(--accent)'}40`, transition:'all 0.15s' }}>
                    Sign Off & Advance
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send-back history */}
      {sendBacks.length > 0 && (
        <div style={{ marginTop:16, background:'var(--card-bg)', border:'1px solid rgba(242,90,90,.15)', borderRadius:16, padding:18 }}>
          <div style={{ fontSize:10, fontWeight:900, color:'var(--red)', textTransform:'uppercase', marginBottom:12, letterSpacing:'.06em', display:'flex', alignItems:'center', gap:6 }}><AlertTriangle size={12} /> Send-Back History ({sendBacks.length})</div>
          {sendBacks.slice(0, 5).map((sb: any, i: number) => (
            <div key={i} style={{ padding:'10px 12px', borderRadius:10, marginBottom:6, background:'rgba(242,90,90,.04)', border:'1px solid rgba(242,90,90,.08)', fontSize:12 }}>
              <div style={{ color:'var(--amber)', fontWeight:700 }}>{sb.reason}</div>
              <div style={{ color:'var(--text3)', fontSize:10, marginTop:3, fontFamily:'JetBrains Mono, monospace' }}>
                {sb.from_stage?.replace('_',' ')} → {sb.to_stage?.replace('_',' ')} · {new Date(sb.created_at).toLocaleDateString()}
                {sb.notes && <span style={{ color:'var(--text2)', fontStyle:'italic', fontFamily:'inherit' }}> · {sb.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared UI helpers ────────────────────────────────────────────
function Section({ label, children, color }: { label:string; children:React.ReactNode; color?:string }) {
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:900, color: color || 'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', paddingBottom:8, marginBottom:14, borderBottom:'1px solid var(--card-border)' }}>{label}</div>
      {children}
    </div>
  )
}
function Grid({ cols, children, style }: { cols:number; children:React.ReactNode; style?:React.CSSProperties }) {
  return <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:12, ...style }}>{children}</div>
}
function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  )
}
const inp: React.CSSProperties = { width:'100%', background:'var(--surface2)', border:'1px solid var(--card-border)', borderRadius:10, padding:'10px 13px', fontSize:13, color:'var(--text1)', outline:'none', transition:'border-color 0.15s' }
const sel: React.CSSProperties = { ...inp }
function Check({ label, checked, onChange }: { label:string; checked:boolean; onChange:(v:boolean)=>void }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, fontWeight:600, color: checked ? 'var(--green)' : 'var(--text2)' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SALES TAB — Full quote builder (all existing Tab 1-3 content merged)
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// Similar Portfolio Photos — AI-powered matching
function SimilarPhotosPanel({ vehicleType, wrapType, description }: { vehicleType?: string; wrapType?: string; description?: string }) {
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [shown, setShown] = useState(false)

  const findSimilar = async () => {
    if (!shown) { setShown(true) }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/similar-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleType, wrapType, description }),
      })
      const data = await res.json()
      setPhotos(data.photos || [])
    } catch {}
    setLoading(false)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: shown ? 12 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Similar Completed Work
        </div>
        <button onClick={findSimilar} disabled={loading} style={{
          padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          cursor: 'pointer', border: '1px solid var(--border)',
          background: 'var(--surface2)', color: 'var(--accent)',
        }}>
          {loading ? 'Searching...' : 'Find Similar'}
        </button>
      </div>
      {shown && (
        photos.length === 0 && !loading ? (
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>No similar photos found in media library.</div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {photos.map((p: any) => (
              <div key={p.id} style={{ position: 'relative', cursor: 'pointer' }} title={p.match_reason}>
                <img src={p.image_url || p.url} alt="Similar work"
                  style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--border)' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>
                  {p.similarity_score}%
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function LinkedEstimatePanel({ project }: { project: any }) {
  const supabase = createClient()
  const router = useRouter()
  const [estimates, setEstimates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const estId = project.form_data?.estimateId
    if (estId) {
      supabase.from('estimates').select('id, estimate_number, title, status, total, subtotal, created_at').eq('id', estId)
        .then(({ data }) => { if (data) setEstimates(data); setLoading(false) })
    } else {
      supabase.from('estimates').select('id, estimate_number, title, status, total, subtotal, created_at').eq('org_id', project.org_id).ilike('title', `%${project.title || ''}%`).limit(5)
        .then(({ data }) => { if (data) setEstimates(data); setLoading(false) })
    }
  }, [project.id])

  const statusColors: Record<string, string> = {
    draft: '#5a6080', sent: '#4f7fff', accepted: '#22c07a', expired: '#f59e0b', rejected: '#f25a5a', void: '#5a6080',
  }

  return (
    <Section label="Linked Estimates" color="#4f7fff">
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Loading estimates...</div>
      ) : estimates.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {estimates.map(est => (
            <div key={est.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer' }}
              onClick={() => router.push(`/estimates/${est.id}`)}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                  <span style={{ color: 'var(--text3)', fontWeight: 600 }}>QT</span> #{est.estimate_number} — {est.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  Created {new Date(est.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                  {fM(est.total || 0)}
                </span>
                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, background: `${statusColors[est.status] || '#5a6080'}18`, color: statusColors[est.status] || '#5a6080' }}>
                  {est.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>No linked estimates found for this job.</div>
      )}
      <button
        onClick={() => router.push('/estimates/new')}
        style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)', color: 'var(--green)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
      >
        + Create New Estimate
      </button>
    </Section>
  )
}

function SalesTab({ f, ff, jobType, setJobType, subType, setSubType, selectedVehicle, setSelectedVehicle, wrapDetail, setWrapDetail, selectedSides, setSelectedSides, selectedPPF, setSelectedPPF, calcSqft, fin, canFinance, teammates, profile, project, isMobileInstall, toggleMobileInstall, installAddress, setInstallAddress, saveInstallAddress, checkingWeather, installWeather }: any) {
  const isVehicle = jobType === 'Commercial' && subType === 'Vehicle'
  const isBox = jobType === 'Commercial' && subType === 'Box Truck'
  const isTrailer = jobType === 'Commercial' && subType === 'Trailer'
  const isMarine = jobType === 'Marine'
  const isPPF = jobType === 'PPF'
  const installerTeam = teammates.filter((t:any) => ['installer','admin','production'].includes(t.role))
  const agentTeam = teammates.filter((t:any) => ['sales_agent','admin'].includes(t.role))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Linked Estimates */}
      <LinkedEstimatePanel project={project} />

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
        <Grid cols={4} style={{marginTop:12}}>
          <Field label="Lead Type">
            <select style={sel} value={f.leadType} onChange={e=>ff('leadType',e.target.value)}>
              <option value="inbound">Inbound</option><option value="outbound">Outbound</option><option value="presold">Pre-sold / Referral</option>
            </select>
          </Field>
          <Field label="Agent">
            <select style={sel} value={f.agent} onChange={e=>ff('agent',e.target.value)}>
              <option value="">Select agent</option>
              {agentTeam.map((t:any) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Installer">
            <select style={sel} value={f.installer} onChange={e=>ff('installer',e.target.value)}>
              <option value="">Unassigned</option>
              {installerTeam.map((t:any) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Install Date"><input style={inp} type="date" value={f.installDate} onChange={e=>ff('installDate',e.target.value)} /></Field>
        </Grid>
      </Section>

      {/* Mobile / Outdoor Install */}
      <Section label="Mobile / Outdoor Install">
        {/* Toggle */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--card-border)', marginBottom:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'rgba(79,127,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <MapPin size={15} style={{ color:'var(--accent)' }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text1)' }}>Mobile / Outdoor Install</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>Turn on if wrapping at customer location or outdoors</div>
          </div>
          <button
            onClick={toggleMobileInstall}
            style={{
              position:'relative', width:44, height:24, borderRadius:12, border:'none', cursor:'pointer',
              background: isMobileInstall ? 'var(--accent)' : 'var(--card-border)',
              transition:'background 0.2s', flexShrink:0,
            }}
          >
            <span style={{
              position:'absolute', top:3, width:18, height:18, borderRadius:'50%', background:'#fff',
              transition:'transform 0.2s',
              transform: isMobileInstall ? 'translateX(23px)' : 'translateX(3px)',
            }} />
          </button>
        </div>

        {/* Install Address (only when mobile is ON) */}
        {isMobileInstall && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Field label="Install Location Address">
              <div style={{ display:'flex', gap:8 }}>
                <input
                  style={{ ...inp, flex:1 }}
                  type="text"
                  value={installAddress}
                  onChange={e => setInstallAddress(e.target.value)}
                  placeholder="123 Main St, Tacoma, WA 98401"
                />
                <button
                  onClick={saveInstallAddress}
                  disabled={checkingWeather || !installAddress.trim()}
                  style={{
                    padding:'10px 16px', borderRadius:10, fontWeight:700, fontSize:12, cursor:'pointer',
                    background: checkingWeather ? 'var(--surface2)' : 'var(--accent)',
                    border:'none', color:'#fff', opacity: (!installAddress.trim() || checkingWeather) ? 0.6 : 1,
                    transition:'all 0.15s', whiteSpace:'nowrap', flexShrink:0,
                  }}
                >
                  {checkingWeather ? 'Checking...' : 'Save & Check Weather'}
                </button>
              </div>
            </Field>

            {!f.installDate && (
              <div style={{ fontSize:11, color:'var(--amber)', display:'flex', alignItems:'center', gap:6 }}>
                <AlertTriangle size={12} />
                Set an install date above to see the weather forecast for that day.
              </div>
            )}

            {/* Weather result */}
            {installWeather && (
              <div style={{
                padding:'12px 14px', borderRadius:10, border:'1px solid',
                borderColor: installWeather.severity === 'danger' ? '#8b5cf6' : installWeather.severity === 'high' ? '#f25a5a' : installWeather.severity === 'medium' ? '#f59e0b' : '#22c07a',
                background: installWeather.severity === 'danger' ? 'rgba(139,92,246,0.08)' : installWeather.severity === 'high' ? 'rgba(242,90,90,0.06)' : installWeather.severity === 'medium' ? 'rgba(245,158,11,0.06)' : 'rgba(34,192,122,0.06)',
              }}>
                {installWeather.severity === 'good' ? (
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#22c07a', fontWeight:600 }}>
                    <ThumbsUp size={14} />
                    Weather looks good for this install date.
                  </div>
                ) : (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <CloudRain size={14} style={{ color: installWeather.severity === 'danger' ? '#8b5cf6' : installWeather.severity === 'high' ? '#f25a5a' : '#f59e0b' }} />
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--text1)' }}>Weather Issues on Install Date</span>
                    </div>
                    <ul style={{ margin:0, paddingLeft:16, display:'flex', flexDirection:'column', gap:4 }}>
                      {installWeather.issues.map((issue, i) => (
                        <li key={i} style={{ fontSize:12, color:'var(--text2)' }}>{issue}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Site Access Info — always visible, not just when mobile */}
        <div style={{ marginTop: 14, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--cyan)', textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:3, height:14, borderRadius:2, background:'var(--cyan)', display:'inline-block' }} />
            Site Access &amp; Contact Info (shown to installer)
          </div>
          <Grid cols={2}>
            <Field label="Access / Gate Code">
              <input style={inp} value={f.access_code || ''} onChange={e=>ff('access_code',e.target.value)} placeholder="e.g. #4521 or 2B-North" />
            </Field>
            <Field label="Point of Contact Name">
              <input style={inp} value={f.site_contact || ''} onChange={e=>ff('site_contact',e.target.value)} placeholder="On-site contact full name" />
            </Field>
          </Grid>
          <Grid cols={2}>
            <Field label="Contact Phone">
              <input style={inp} value={f.site_contact_phone || ''} onChange={e=>ff('site_contact_phone',e.target.value)} placeholder="(253) 555-0100" />
            </Field>
            <Field label="Contact Email">
              <input style={inp} value={f.site_contact_email || ''} onChange={e=>ff('site_contact_email',e.target.value)} placeholder="contact@example.com" />
            </Field>
          </Grid>
          <Field label="Access Directions">
            <textarea style={{...inp, minHeight:60}} value={f.access_instructions || ''} onChange={e=>ff('access_instructions',e.target.value)} placeholder="e.g. Enter through rear gate, use side entrance, ring bell at door B..." />
          </Field>
        </div>
      </Section>

      {/* Job Type */}
      <Section label="Job Type">
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {(['Commercial','Marine','PPF'] as const).map(jt => (
            <button key={jt} onClick={() => setJobType(jt)} style={{
              padding:'8px 20px', borderRadius:9, fontWeight:800, fontSize:13, cursor:'pointer', border:'2px solid',
              background: jobType===jt ? 'var(--accent)' : 'var(--surface2)',
              borderColor: jobType===jt ? 'var(--accent)' : 'var(--border)',
              color: jobType===jt ? '#fff' : 'var(--text2)',
            }}>{jt === 'Commercial' ? 'Wrap' : jt === 'Marine' ? 'Marine' : 'PPF'}</button>
          ))}
        </div>
        {jobType === 'Commercial' && (
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
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

      {/* Vehicle Grid */}
      {isVehicle && (
        <Section label="Select Vehicle Type">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8, marginBottom:12 }}>
            {COMM_VEHICLES.map(veh => (
              <button key={veh.name} onClick={() => setSelectedVehicle(veh)} style={{
                padding:'10px 8px', borderRadius:10, cursor:'pointer', textAlign:'center', border:'2px solid',
                background: selectedVehicle?.name===veh.name ? 'rgba(79,127,255,.12)' : 'var(--surface2)',
                borderColor: selectedVehicle?.name===veh.name ? 'var(--accent)' : 'var(--border)',
              }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text1)' }}>{veh.name}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'var(--green)' }}>{fM(veh.pay)}</div>
                <div style={{ fontSize:10, color:'var(--text3)' }}>{veh.hrs}h</div>
              </button>
            ))}
          </div>
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
        </Section>
      )}

      {/* Box Truck / Trailer */}
      {(isBox || isTrailer) && (
        <Section label={`${subType} Dimensions`}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            {(isBox ? BOX_TRUCK_LENGTHS : TRAILER_LENGTHS).map(l => (
              <button key={l} onClick={() => { ff('len', l.toString()); setTimeout(calcSqft, 50) }} style={{
                padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', border:'1px solid var(--border)',
                background: f.len===l.toString() ? 'var(--accent)' : 'var(--surface2)',
                color: f.len===l.toString() ? '#fff' : 'var(--text2)',
              }}>{l}ft</button>
            ))}
          </div>
          <Grid cols={4}>
            <Field label="Length (ft)"><input style={inp} type="number" value={f.len} onChange={e=>ff('len',e.target.value)} onBlur={calcSqft} /></Field>
            <Field label="Width (ft)"><input style={inp} type="number" value={f.wid} onChange={e=>ff('wid',e.target.value)} onBlur={calcSqft} /></Field>
            <Field label="Height ft"><input style={inp} type="number" value={f.hft} onChange={e=>ff('hft',e.target.value)} onBlur={calcSqft} /></Field>
            <Field label="Height in"><input style={inp} type="number" value={f.hin} onChange={e=>ff('hin',e.target.value)} onBlur={calcSqft} /></Field>
          </Grid>
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            {['left','right','rear','front'].map(s => (
              <label key={s} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, fontWeight:700, color: selectedSides.has(s) ? 'var(--accent)' : 'var(--text3)' }}>
                <input type="checkbox" checked={selectedSides.has(s)} onChange={() => {
                  const ns = new Set(selectedSides); ns.has(s) ? ns.delete(s) : ns.add(s); setSelectedSides(ns); setTimeout(calcSqft, 50)
                }} />{s.charAt(0).toUpperCase()+s.slice(1)}
              </label>
            ))}
          </div>
        </Section>
      )}

      {/* Marine */}
      {isMarine && (
        <Section label="Marine">
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            {MARINE_LENGTHS.map(l => (
              <button key={l} onClick={() => ff('len', l.toString())} style={{ padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', border:'1px solid var(--border)', background: f.len===l.toString() ? 'var(--cyan)' : 'var(--surface2)', color: f.len===l.toString() ? '#0d0f14' : 'var(--text2)' }}>{l}'</button>
            ))}
          </div>
          <Grid cols={3}>
            <Field label="$/Linear Ft"><input style={inp} type="number" value={f.unitPrice} onChange={e=>ff('unitPrice',e.target.value)} /></Field>
            <Field label="Linear Ft"><input style={inp} type="number" value={f.unitQty} onChange={e=>ff('unitQty',e.target.value)} /></Field>
            <Field label="Boat Length"><input style={inp} type="number" value={f.len} onChange={e=>ff('len',e.target.value)} /></Field>
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
                <div style={{ fontSize:13, fontWeight:800, color:'var(--text1)' }}>{pkg.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{pkg.desc}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:14, color:'#8b5cf6', fontWeight:700 }}>{fM(pkg.sale)}</div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Material & Pricing */}
      <Section label="Pricing & Material">
        <Grid cols={3}>
          {!isPPF && <Field label="Material Rate"><select style={sel} value={f.matRate} onChange={e=>ff('matRate',e.target.value)}>{MAT_RATES.map(m => <option key={m.rate} value={m.rate}>{m.label} — ${m.rate}/sqft</option>)}</select></Field>}
          <Field label="Net Sqft"><input style={inp} type="number" value={f.sqft} onChange={e=>ff('sqft',e.target.value)} /></Field>
          <Field label="Design Fee ($)"><input style={inp} type="number" value={f.designFee} onChange={e=>ff('designFee',e.target.value)} /></Field>
          <Field label="Misc Costs ($)"><input style={inp} type="number" value={f.misc} onChange={e=>ff('misc',e.target.value)} /></Field>
          {!isVehicle && !isPPF && <Field label="Labor %"><input style={inp} type="number" value={f.laborPct} onChange={e=>ff('laborPct',e.target.value)} /></Field>}
          <Field label="Target GPM %"><input style={inp} type="number" value={f.margin} onChange={e=>ff('margin',e.target.value)} /></Field>
        </Grid>
        <div style={{ marginTop:12 }}>
          <Field label="Override Sale Price"><input style={{...inp, maxWidth:220}} type="number" value={f.salesPrice} onChange={e=>ff('salesPrice',e.target.value)} placeholder={fM(fin.sale)+' (auto)'} /></Field>
        </div>
      </Section>

      {/* Scope & Logistics */}
      <Section label="Scope & Notes">
        <Grid cols={2}>
          <Field label="Parts to Wrap"><textarea style={{...inp, minHeight:70}} value={f.coverage} onChange={e=>ff('coverage',e.target.value)} placeholder="Full vehicle, all panels..." /></Field>
          <Field label="Exclusions"><textarea style={{...inp, minHeight:70}} value={f.exclusions} onChange={e=>ff('exclusions',e.target.value)} placeholder="Mirrors, handles, roof..." /></Field>
          <Field label="Sales Notes"><textarea style={{...inp, minHeight:70}} value={f.salesNotes} onChange={e=>ff('salesNotes',e.target.value)} placeholder="Customer requests, follow-ups..." /></Field>
          <Field label="Internal Notes"><textarea style={{...inp, minHeight:70}} value={f.internalNotes} onChange={e=>ff('internalNotes',e.target.value)} placeholder="Installer notes, shop info..." /></Field>
        </Grid>
        <div style={{ display:'flex', gap:20, marginTop:12 }}>
          <Check label="Deposit Collected" checked={f.deposit} onChange={v => ff('deposit',v)} />
          <Check label="Contract Signed" checked={f.contractSigned} onChange={v => ff('contractSigned',v)} />
        </div>
      </Section>

      {/* Similar portfolio photos */}
      <SimilarPhotosPanel vehicleType={f.vehicle} wrapType={subType} description={f.coverage || f.salesNotes} />

      {/* Customer link generator */}
      <IntakeLinkGenerator projectId={project.id} orgId={project.org_id} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Linked Design Project fetcher
function LinkedDesignPanel({ project }: { project: any }) {
  const supabase = createClient()
  const { xpToast, badgeToast } = useToast()
  const [designProjects, setDesignProjects] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('design_projects').select('*').eq('project_id', project.id).eq('org_id', project.org_id)
      .then(({ data }) => { if (data) setDesignProjects(data) })
  }, [project.id, project.org_id])

  async function createDesignProject() {
    if (!newTitle.trim()) return
    setLoading(true)
    const { data, error } = await supabase.from('design_projects').insert({
      org_id: project.org_id,
      project_id: project.id,
      client_name: project.title || 'Job',
      design_type: 'Full Wrap',
      description: newTitle.trim(),
      status: 'brief',
    }).select().single()
    if (!error && data) {
      setDesignProjects(p => [...p, data])
      setNewTitle('')
      setCreating(false)
    }
    setLoading(false)
  }

  const stageColors: Record<string, string> = {
    brief: '#f59e0b', in_progress: '#4f7fff', proof_sent: '#22d3ee', approved: '#22c07a',
  }

  return (
    <Section label="Linked Design Projects" color="#8b5cf6">
      {designProjects.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {designProjects.map(dp => (
            <div key={dp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{dp.client_name} — {dp.design_type}</div>
                {dp.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{dp.description}</div>}
              </div>
              <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${stageColors[dp.status] || '#5a6080'}18`, color: stageColors[dp.status] || '#5a6080' }}>
                {dp.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>No design projects linked to this job yet.</div>
      )}
      {creating ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Design brief / description..."
            onKeyDown={e => e.key === 'Enter' && createDesignProject()}
            style={{ flex: 1, ...inp }} />
          <button onClick={createDesignProject} disabled={loading || !newTitle.trim()}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#8b5cf6', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {loading ? '...' : 'Create'}
          </button>
          <button onClick={() => setCreating(false)}
            style={{ padding: '8px 10px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setCreating(true)}
          style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          + Link New Design Project
        </button>
      )}
    </Section>
  )
}

// DESIGN TAB
// ═══════════════════════════════════════════════════════════════════
function DesignTab({ f, ff, project, profile }: any) {
  const { xpToast, badgeToast } = useToast()
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <ProofingPanel project={project} profile={profile} />
      <LinkedDesignPanel project={project} />
      <Section label="Design & Artwork" color="#8b5cf6">
        <Check label="Design / Artwork Required" checked={f.designNeeded} onChange={v => ff('designNeeded',v)} />
        <Grid cols={2} style={{marginTop:12}}>
          <Field label="Design Instructions"><textarea style={{...inp,minHeight:90}} value={f.designNotes} onChange={e=>ff('designNotes',e.target.value)} placeholder="Logo placement, colors, text..." /></Field>
          <Field label="File / Asset Status"><textarea style={{...inp,minHeight:90}} value={f.assetStatus} onChange={e=>ff('assetStatus',e.target.value)} placeholder="What files do we have?" /></Field>
          <Field label="Customer Communication"><textarea style={{...inp,minHeight:80}} value={f.designComm} onChange={e=>ff('designComm',e.target.value)} placeholder="Last call/email summary..." /></Field>
          <Field label="Revision Notes"><textarea style={{...inp,minHeight:80}} value={f.revisionNotes} onChange={e=>ff('revisionNotes',e.target.value)} placeholder="Change log..." /></Field>
        </Grid>
        <Grid cols={3} style={{marginTop:12}}>
          <Field label="Drive / Asset Link"><input style={inp} type="url" value={f.driveLink} onChange={e=>ff('driveLink',e.target.value)} placeholder="https://drive.google.com/..." /></Field>
          <Field label="Approval Status">
            <select style={sel} value={f.approvalStatus} onChange={e => {
              const val = e.target.value
              ff('approvalStatus', val)
              if (val === 'approved' && f.approvalStatus !== 'approved') {
                const hasRevisions = !!(f.revisionNotes || '').trim()
                fetch('/api/xp/award', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: hasRevisions ? 'design_approved_with_revisions' : 'design_approved_no_revisions',
                    sourceType: 'project', sourceId: project.id,
                  }),
                })
                  .then(r => r.ok ? r.json() : null)
                  .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
                    if (res?.amount) xpToast(res.amount, 'Design approved', res.leveledUp, res.newLevel)
                    if (res?.newBadges?.length) badgeToast(res.newBadges)
                  })
                  .catch((error) => { console.error(error); })
              }
            }}>
              <option value="">Not Started</option>
              <option value="proof_sent">Proof Sent</option>
              <option value="revisions">Revisions Requested</option>
              <option value="approved">Design Approved</option>
            </select>
          </Field>
          <Field label="Brand Colors"><input style={inp} value={f.brandColors} onChange={e=>ff('brandColors',e.target.value)} placeholder="PMS 286C Blue, white" /></Field>
        </Grid>
      </Section>

      <Section label="Pre-Install Warnings">
        <Field label="Vehicle Conditions / Warnings">
          <textarea style={{...inp,minHeight:80}} value={f.warnings} onChange={e=>ff('warnings',e.target.value)} placeholder="Rust, old wrap remnants, paint chips..." />
        </Field>
      </Section>

      {/* Send bid to designer */}
      <Section label="Designer Bidding">
        <div style={{ padding:16, background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>Send design package to freelance designers for bidding</div>
          <button style={{ padding:'8px 16px', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer', background:'#8b5cf6', border:'none', color:'#fff', display:'flex', alignItems:'center', gap:6 }}>
            <Package size={13} /> Open Designer Bid Panel
          </button>
        </div>
      </Section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCTION TAB — Material logging, print checklist, sign-off
// ═══════════════════════════════════════════════════════════════════
function ProductionTab({ f, ff, project, profile }: any) {
  const qSqft = v(f.sqft)
  const estLinft = qSqft > 0 ? Math.ceil(qSqft / (v(f.matWidth, 54) / 12)) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Section label="Material Log — Required to advance" color="#22c07a">
        <div style={{ padding:14, background:'rgba(34,192,122,.06)', border:'1px solid rgba(34,192,122,.2)', borderRadius:10 }}>
          <Grid cols={3}>
            <Field label="Linear Feet Printed *"><input style={inp} type="number" value={f.linftPrinted} onChange={e=>ff('linftPrinted',e.target.value)} placeholder={estLinft ? `~${estLinft} estimated` : '0'} /></Field>
            <Field label="Material Width (in)"><input style={inp} type="number" value={f.matWidth} onChange={e=>ff('matWidth',e.target.value)} placeholder="54" /></Field>
            <Field label="Rolls / Sheets Used"><input style={inp} type="number" value={f.rollsUsed} onChange={e=>ff('rollsUsed',e.target.value)} placeholder="1" /></Field>
          </Grid>
          <Grid cols={2} style={{marginTop:10}}>
            <Field label="Material Type / SKU"><input style={inp} value={f.matSku} onChange={e=>ff('matSku',e.target.value)} placeholder="3M IJ180Cv3 Gloss" /></Field>
            <Field label="Print Notes"><input style={inp} value={f.printNotes} onChange={e=>ff('printNotes',e.target.value)} placeholder="Reprints, color issues..." /></Field>
          </Grid>

          {/* Buffer calc */}
          {v(f.linftPrinted) > 0 && qSqft > 0 && (() => {
            const sqftPrinted = v(f.linftPrinted) * (v(f.matWidth, 54) / 12)
            const buf = Math.round((sqftPrinted - qSqft) / qSqft * 100)
            return (
              <div style={{ marginTop:12, display:'flex', gap:12 }}>
                <div style={{ padding:'8px 14px', background:'var(--surface)', borderRadius:8, border:'1px solid var(--border)', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>Sqft Printed</div>
                  <div style={{ fontFamily:'JetBrains Mono', fontSize:16, fontWeight:700, color:'var(--cyan)' }}>{Math.round(sqftPrinted)}</div>
                </div>
                <div style={{ padding:'8px 14px', background:'var(--surface)', borderRadius:8, border:'1px solid var(--border)', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>Sqft Quoted</div>
                  <div style={{ fontFamily:'JetBrains Mono', fontSize:16, fontWeight:700, color:'var(--text1)' }}>{Math.round(qSqft)}</div>
                </div>
                <div style={{ padding:'8px 14px', background:'var(--surface)', borderRadius:8, border:`1px solid ${Math.abs(buf) > 10 ? 'rgba(242,90,90,.3)' : 'rgba(34,192,122,.3)'}`, textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>Buffer</div>
                  <div style={{ fontFamily:'JetBrains Mono', fontSize:16, fontWeight:700, color: Math.abs(buf) > 10 ? 'var(--red)' : 'var(--green)' }}>{buf > 0 ? '+' : ''}{buf}%</div>
                </div>
              </div>
            )
          })()}
        </div>
      </Section>

      <Section label="Print Checklist">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Check label="Files prepped and color-proofed" checked={f.printFilesReady || false} onChange={v => ff('printFilesReady',v)} />
          <Check label="Material loaded and calibrated" checked={f.printMatLoaded || false} onChange={v => ff('printMatLoaded',v)} />
          <Check label="Test print verified" checked={f.printTestDone || false} onChange={v => ff('printTestDone',v)} />
          <Check label="All panels printed and cut" checked={f.printAllPanels || false} onChange={v => ff('printAllPanels',v)} />
          <Check label="Laminated / over-coated" checked={f.printLaminated || false} onChange={v => ff('printLaminated',v)} />
          <Check label="Quality check passed" checked={f.printQC || false} onChange={v => ff('printQC',v)} />
        </div>
      </Section>

      <RemnantMatchPanel sqft={qSqft} material={f.matSku} />
      <MaterialTracking projectId={project.id} orgId={project.org_id} userId={profile.id} project={project} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// REMNANT MATCH PANEL — Finds usable remnant pieces for this job
// ═══════════════════════════════════════════════════════════════════
function RemnantMatchPanel({ sqft, material }: { sqft: number; material: string }) {
  const [matches, setMatches]   = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)

  async function find() {
    if (sqft <= 0) return
    setLoading(true)
    const res = await fetch('/api/inventory/match-remnant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sqftNeeded: sqft, material }),
    })
    const data = await res.json()
    setMatches(data.matches || [])
    setSearched(true)
    setLoading(false)
  }

  return (
    <div style={{ padding: '14px 16px', background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: searched && matches.length > 0 ? 12 : 0 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Remnant Match</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {sqft > 0 ? `Looking for ${sqft} sqft of usable remnants` : 'Enter sqft above to search for remnants'}
          </div>
        </div>
        <button
          onClick={find}
          disabled={loading || sqft <= 0}
          style={{ padding: '7px 14px', background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: sqft > 0 ? 'pointer' : 'not-allowed', opacity: sqft > 0 ? 1 : 0.5 }}
        >
          {loading ? 'Searching...' : 'Find Remnants'}
        </button>
      </div>
      {searched && matches.length === 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>No matching remnants found. Full roll needed.</div>
      )}
      {matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {matches.slice(0, 3).map((m: any) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>{m.brand} {m.color} — {m.finish}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.sqft_available} sqft available · {m.location || 'No location'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: m.fit_score >= 75 ? 'var(--green)' : 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>{m.fit_score}%</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>fit score</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// INSTALL TAB — Vinyl check, timer, post-install verification
// ═══════════════════════════════════════════════════════════════════
function InstallTab({ f, ff, project, profile, teammates }: any) {
  const hasAccess = f.access_code || f.access_instructions || f.site_contact || f.site_contact_phone || f.site_contact_email

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Site Access Card ──────────────────────────────────────── */}
      {hasAccess && (
        <div style={{ background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.3)', borderRadius:12, padding:'16px 18px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--cyan)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:3, height:14, borderRadius:2, background:'var(--cyan)', display:'inline-block' }} />
            Site Access Info
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
            {f.access_code && (
              <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, padding:'10px 14px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--amber)', textTransform:'uppercase', marginBottom:4 }}>Access / Gate Code</div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:22, fontWeight:900, color:'var(--text1)', letterSpacing:'0.15em' }}>{f.access_code}</div>
              </div>
            )}
            {(f.site_contact || f.site_contact_phone || f.site_contact_email) && (
              <div style={{ background:'var(--surface2)', borderRadius:10, padding:'10px 14px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:4 }}>Point of Contact</div>
                {f.site_contact && <div style={{ fontSize:14, fontWeight:700, color:'var(--text1)', marginBottom:2 }}>{f.site_contact}</div>}
                {f.site_contact_phone && (
                  <a href={`tel:${f.site_contact_phone}`} style={{ fontSize:13, color:'var(--accent)', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                    📞 {f.site_contact_phone}
                  </a>
                )}
                {f.site_contact_email && (
                  <a href={`mailto:${f.site_contact_email}`} style={{ fontSize:12, color:'var(--accent)', textDecoration:'none', display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                    ✉ {f.site_contact_email}
                  </a>
                )}
              </div>
            )}
            {f.access_instructions && (
              <div style={{ background:'var(--surface2)', borderRadius:10, padding:'10px 14px', border:'1px solid var(--border)', gridColumn: f.access_code && (f.site_contact || f.site_contact_phone) ? '1 / -1' : 'auto' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:4 }}>Access Directions</div>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>{f.access_instructions}</div>
              </div>
            )}
          </div>
        </div>
      )}
      {!hasAccess && (
        <div style={{ background:'rgba(245,158,11,0.06)', border:'1px dashed rgba(245,158,11,0.3)', borderRadius:10, padding:'12px 16px', fontSize:13, color:'var(--amber)', display:'flex', alignItems:'center', gap:8 }}>
          ⚠ No site access info entered. Go to the Sales tab to add access code, directions, and point of contact.
        </div>
      )}

      {/* Condition Report */}
      <ConditionReportLauncher project={project} profile={profile} />

      {/* Pre-install vinyl check */}
      <Section label="Pre-Install Vinyl Check" color="#22d3ee">
        <div style={{ padding:14, background:'rgba(34,211,238,.06)', border:'1px solid rgba(34,211,238,.2)', borderRadius:10 }}>
          <div style={{ fontSize:11, color:'var(--text2)', marginBottom:10 }}>Before starting: inspect vinyl condition and confirm below</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <Check label="Vinyl inspected — no defects" checked={f.vinylOk} onChange={v => ff('vinylOk',v)} />
            <Check label="Color matches approved design" checked={f.colorMatch} onChange={v => ff('colorMatch',v)} />
            <Check label="Print dimensions correct" checked={f.dimsCorrect} onChange={v => ff('dimsCorrect',v)} />
            <Check label="Vehicle surface prepped & clean" checked={f.surfacePrepped} onChange={v => ff('surfacePrepped',v)} />
          </div>
          <Field label="Vinyl Condition Notes">
            <textarea style={{...inp, minHeight:60}} value={f.vinylNotes} onChange={e=>ff('vinylNotes',e.target.value)} placeholder="Note any issues — will send back to production if needed..." />
          </Field>
        </div>
      </Section>

      {/* Install Timer */}
      <Section label="Install Timer" color="#22c07a">
        <InstallTimer projectId={project.id} orgId={project.org_id} installerId={profile.id} />
      </Section>

      {/* Post-install verification */}
      <Section label="Post-Install Verification" color="#22d3ee">
        <div style={{ padding:14, background:'rgba(34,211,238,.06)', border:'1px solid rgba(34,211,238,.2)', borderRadius:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            <Check label="Post-heat applied throughout" checked={f.postHeat} onChange={v => ff('postHeat',v)} />
            <Check label="Edges properly finished & tucked" checked={f.postEdges} onChange={v => ff('postEdges',v)} />
            <Check label="No bubbles or lifting edges" checked={f.postNoBubbles} onChange={v => ff('postNoBubbles',v)} />
            <Check label="Seams aligned and hidden" checked={f.postSeams} onChange={v => ff('postSeams',v)} />
            <Check label="Vehicle cleaned & presentable" checked={f.postCleaned} onChange={v => ff('postCleaned',v)} />
            <Check label="Photos taken for record" checked={f.postPhotos} onChange={v => ff('postPhotos',v)} />
          </div>
          <Grid cols={3}>
            <Field label="Actual Hours *"><input style={inp} type="number" value={f.actualHrs} onChange={e=>ff('actualHrs',e.target.value)} /></Field>
            <Field label="Install Date"><input style={inp} type="date" value={f.actualDate} onChange={e=>ff('actualDate',e.target.value)} /></Field>
            <Field label="Installer Signature *"><input style={inp} value={f.installerSig} onChange={e=>ff('installerSig',e.target.value)} placeholder="Full name" /></Field>
          </Grid>
          <div style={{ marginTop:10 }}>
            <Field label="Final Notes"><textarea style={{...inp, minHeight:60}} value={f.installNotes} onChange={e=>ff('installNotes',e.target.value)} placeholder="Wrap condition, client feedback..." /></Field>
          </div>
        </div>
      </Section>

      <SendBidToInstaller projectId={project.id} orgId={project.org_id} project={project} teammates={teammates || []} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// QC TAB — Quality review, quoted vs actual
// ═══════════════════════════════════════════════════════════════════
function QCTab({ f, ff, fin, project, profile }: any) {
  const reprintCost = v(f.reprintCost)
  const adjProfit = fin.profit - reprintCost
  const adjGPM = fin.sale > 0 ? (adjProfit / fin.sale) * 100 : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Section label="QC Review" color="#f59e0b">
        <div style={{ padding:14, background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.25)', borderRadius:10 }}>
          <Grid cols={3}>
            <Field label="QC Result">
              <select style={sel} value={f.qcPass} onChange={e=>ff('qcPass',e.target.value)}>
                <option value="pass">Pass — Ship it</option>
                <option value="reprint">Reprint Needed</option>
                <option value="fix">Minor Fix Needed</option>
              </select>
            </Field>
            <Field label="Final Linear Feet"><input style={inp} type="number" value={f.finalLinft} onChange={e=>ff('finalLinft',e.target.value)} placeholder={f.linftPrinted || '0'} /></Field>
            <Field label="Reprint Cost ($)"><input style={inp} type="number" value={f.reprintCost} onChange={e=>ff('reprintCost',e.target.value)} placeholder="0" /></Field>
          </Grid>
          <div style={{ marginTop:10 }}>
            <Field label="QC Notes"><textarea style={{...inp, minHeight:60}} value={f.qcNotes} onChange={e=>ff('qcNotes',e.target.value)} placeholder="Wrap quality, seams, corners, bubbles..." /></Field>
          </div>
        </div>
      </Section>

      {/* Adjusted numbers */}
      {reprintCost > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          <div style={{ textAlign:'center', padding:12, background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>Sale Price</div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:18, fontWeight:700, color:'var(--accent)' }}>{fM(fin.sale)}</div>
          </div>
          <div style={{ textAlign:'center', padding:12, background:'var(--surface2)', borderRadius:10, border:'1px solid rgba(242,90,90,.3)' }}>
            <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>Reprint Deduct</div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:18, fontWeight:700, color:'var(--red)' }}>-{fM(reprintCost)}</div>
          </div>
          <div style={{ textAlign:'center', padding:12, background:'var(--surface2)', borderRadius:10, border:'1px solid rgba(34,192,122,.3)' }}>
            <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>Adj Profit</div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:18, fontWeight:700, color:'var(--green)' }}>{fM(adjProfit)}</div>
          </div>
          <div style={{ textAlign:'center', padding:12, background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>Adj GPM</div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:18, fontWeight:700, color: adjGPM >= 70 ? 'var(--green)' : 'var(--red)' }}>{fP(adjGPM)}</div>
          </div>
        </div>
      )}

      <QuotedVsActual projectId={project.id} orgId={project.org_id} project={project} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CLOSE TAB — Final approval, commission lock, referrals
// ═══════════════════════════════════════════════════════════════════
function ExpensesSection({ f, ff }: { f: any; ff: (k: string, v: any) => void }) {
  const { xpToast, badgeToast } = useToast()
  const [desc, setDesc] = useState('')
  const [amt, setAmt]   = useState('')
  const expenses: { desc: string; amount: number }[] = f.jobExpenses || []

  function addExpense() {
    const amount = parseFloat(amt)
    if (!desc.trim() || isNaN(amount) || amount <= 0) return
    const next = [...expenses, { desc: desc.trim(), amount }]
    ff('jobExpenses', next)
    setDesc(''); setAmt('')
    // Award log_expense XP
    fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_expense', sourceType: 'job_expense' }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
        if (res?.amount) xpToast(res.amount, 'Expense logged', res.leveledUp, res.newLevel)
        if (res?.newBadges?.length) badgeToast(res.newBadges)
      })
      .catch((error) => { console.error(error); })
  }

  function removeExpense(i: number) {
    ff('jobExpenses', expenses.filter((_, idx) => idx !== i))
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <Section label="Job Expenses" color="#f59e0b">
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
        Track additional costs (materials, rush fees, permits, etc.) that reduce final profit.
      </div>
      {expenses.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {expenses.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>{e.desc}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
                -{fM(e.amount)}
              </span>
              <button onClick={() => removeExpense(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}><X size={13} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>Total Expenses</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: 'var(--amber)' }}>{fM(total)}</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Description (e.g., Reprint, Rush fee)"
          onKeyDown={e => e.key === 'Enter' && addExpense()}
          style={{ flex: 2, padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text1)', fontSize: 12, outline: 'none' }}
        />
        <input
          value={amt}
          onChange={e => setAmt(e.target.value)}
          placeholder="Amount $"
          type="number"
          min="0"
          onKeyDown={e => e.key === 'Enter' && addExpense()}
          style={{ width: 110, padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text1)', fontSize: 12, outline: 'none' }}
        />
        <button onClick={addExpense} style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--amber)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Add
        </button>
      </div>
    </Section>
  )
}

function CloseTab({ f, ff, fin, project, profile, sendBacks, teammates }: any) {
  const expenses: { desc: string; amount: number }[] = f.jobExpenses || []
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const reprintCost = v(f.reprintCost)
  const adjProfit = fin.profit - reprintCost - totalExpenses
  const adjGPM = fin.sale > 0 ? (adjProfit / fin.sale) * 100 : 0
  // Commission: base + high GPM bonus, capped per source, GPM <65% protection
  const sourceRates: Record<string, { base: number; max: number }> = {
    inbound: { base: 0.045, max: 0.075 }, outbound: { base: 0.07, max: 0.10 },
    presold: { base: 0.05, max: 0.05 }, referral: { base: 0.045, max: 0.075 },
  }
  const sr = sourceRates[f.leadType] || sourceRates.inbound
  const protected_ = adjGPM < 65
  let commRate = sr.base
  if (!protected_ && f.leadType !== 'presold' && adjGPM > 73) commRate += 0.02
  commRate = Math.min(commRate, sr.max)
  const adjComm = Math.max(0, adjProfit * commRate)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <ExpensesSection f={f} ff={ff} />

      <Section label="Final Numbers Review" color="#8b5cf6">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
          {[
            { label:'Sale', val: fM(fin.sale), color:'var(--accent)' },
            { label:'COGS', val: fM(fin.cogs), color:'var(--text2)' },
            { label:'Profit', val: fM(adjProfit), color:'var(--green)' },
            { label:'GPM', val: fP(adjGPM), color: adjGPM >= 70 ? 'var(--green)' : 'var(--red)' },
            { label:'Commission', val: fM(adjComm), color:'var(--purple)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center', padding:12, background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>{s.label}</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize:18, fontWeight:700, color:s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {(reprintCost > 0 || totalExpenses > 0) && (
          <div style={{ padding:10, background:'rgba(242,90,90,.08)', border:'1px solid rgba(242,90,90,.2)', borderRadius:8, fontSize:12, color:'var(--red)', marginBottom:12 }}>
            {reprintCost > 0 && <><AlertTriangle size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} /> Reprint cost of {fM(reprintCost)} deducted. </>}
            {totalExpenses > 0 && <><AlertTriangle size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} /> Job expenses of {fM(totalExpenses)} deducted. </>}
            Commission recalculated on adjusted profit.
          </div>
        )}

        <Field label="Sales Manager Sign-Off Notes">
          <textarea style={{...inp, minHeight:80}} value={f.closeNotes} onChange={e=>ff('closeNotes',e.target.value)} placeholder="Final approval notes, commission adjustments..." />
        </Field>

        <div style={{ marginTop:12 }}>
          <Check label="I approve this job — lock commission and close" checked={f.finalApproved} onChange={v => ff('finalApproved',v)} />
        </div>
      </Section>

      <ReferralPanel projectId={project.id} orgId={project.org_id} project={project} teammates={teammates || []} />

      {/* Send-back summary */}
      {sendBacks.length > 0 && (
        <Section label={`Send-Backs (${sendBacks.length})`}>
          <div style={{ fontSize:11, color:'var(--text3)' }}>
            {sendBacks.length} send-back(s) during this job's lifecycle
          </div>
        </Section>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PURCHASING TAB — Purchase Orders tied to this job
// ═══════════════════════════════════════════════════════════════════
function PurchasingTab({ projectId, orgId, project }: { projectId: string; orgId: string; project: any }) {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ vendor: '', description: '', quantity: '1', unit_cost: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  function showMsg(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('purchase_orders').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [projectId])

  async function createPO() {
    if (!form.vendor || !form.unit_cost) { showMsg('Vendor and cost required'); return }
    setSaving(true)
    const qty = parseFloat(form.quantity) || 1
    const unitCost = parseFloat(form.unit_cost) || 0
    const lineItems = [{ description: form.description || form.vendor, quantity: qty, unit_cost: unitCost, total: qty * unitCost }]
    const total = qty * unitCost

    const { error } = await supabase.from('purchase_orders').insert({
      project_id: projectId, org_id: orgId,
      vendor: form.vendor, status: 'draft',
      line_items: lineItems, total,
      notes: form.notes,
    })
    if (!error) {
      showMsg('Purchase order created')
      setShowForm(false)
      setForm({ vendor: '', description: '', quantity: '1', unit_cost: '', notes: '' })
      load()
    } else {
      showMsg('Error creating PO: ' + error.message)
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('purchase_orders').update({ status }).eq('id', id)
    load()
  }

  const totalSpend = orders.reduce((s, o) => s + (o.total || 0), 0)
  const STATUS_COLORS: Record<string, string> = { draft: '#9299b5', ordered: '#4f7fff', received: '#22c07a', cancelled: '#f25a5a' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 700, color: 'var(--text1)', zIndex: 9999 }}>{toast}</div>}

      {/* Header with total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>Purchase Orders</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Materials and supplies for this job</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {orders.length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Total Spend</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 800, color: 'var(--amber)' }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalSpend)}
              </div>
            </div>
          )}
          <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <ShoppingCart size={14} />New PO
          </button>
        </div>
      </div>

      {/* New PO Form */}
      {showForm && (
        <div style={{ background: 'rgba(79,127,255,.06)', border: '1px solid rgba(79,127,255,.25)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.07em' }}>New Purchase Order</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Vendor *</div>
              <input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="e.g. Fellers, Avery, Local Supplier" style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' }} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. 3M IJ180Cv3 Gloss 54in x 50ft" style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' }} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Quantity</div>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' }} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Unit Cost ($) *</div>
              <input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' }} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special instructions, delivery notes..." style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', minHeight: 60, resize: 'none' }} /></div>
          {form.quantity && form.unit_cost && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
              Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((parseFloat(form.quantity) || 1) * (parseFloat(form.unit_cost) || 0))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '9px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={createPO} disabled={saving} style={{ flex: 2, padding: '9px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : 'Create Purchase Order'}</button>
          </div>
        </div>
      )}

      {/* PO List */}
      {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>}
      {!loading && orders.length === 0 && !showForm && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <div style={{ fontSize: 13 }}>No purchase orders yet</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Create a PO to track materials and supplies for this job</div>
        </div>
      )}
      {orders.map(o => {
        const lines: any[] = o.line_items || []
        return (
          <div key={o.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{o.vendor}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{new Date(o.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 800, color: 'var(--amber)' }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(o.total || 0)}
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[o.status] || '#9299b5'}18`, color: STATUS_COLORS[o.status] || '#9299b5' }}>{o.status}</span>
              </div>
            </div>
            {lines.map((l: any, i: number) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text2)', padding: '4px 0', borderBottom: i < lines.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {l.description} × {l.quantity} @ ${l.unit_cost} = ${l.total}
              </div>
            ))}
            {o.notes && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, fontStyle: 'italic' }}>{o.notes}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {o.status === 'draft' && <button onClick={() => updateStatus(o.id, 'ordered')} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(79,127,255,.15)', color: 'var(--accent)', border: '1px solid rgba(79,127,255,.3)' }}>Mark Ordered</button>}
              {o.status === 'ordered' && <button onClick={() => updateStatus(o.id, 'received')} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(34,192,122,.15)', color: 'var(--green)', border: '1px solid rgba(34,192,122,.3)' }}>Mark Received</button>}
              {o.status !== 'cancelled' && o.status !== 'received' && <button onClick={() => updateStatus(o.id, 'cancelled')} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(242,90,90,.1)', color: 'var(--red)', border: '1px solid rgba(242,90,90,.3)' }}>Cancel</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Activity Log Tab ─────────────────────────────────────────────
function ActivityLogTab({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/activity-log?project_id=${projectId}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [projectId])

  function relTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    return `${d}d ago`
  }

  const ACTION_ICONS: Record<string, string> = {
    stage_advanced: '→',
    stage_sent_back: '←',
    job_created: '+',
    job_closed: '✓',
    note_added: '✎',
    file_uploaded: '↑',
    expense_added: '$',
    po_created: '📦',
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>Loading activity...</div>

  if (logs.length === 0) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <Activity size={32} style={{ color: 'var(--text3)', marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No activity recorded yet</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Actions taken on this job will appear here</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {logs.map((log, i) => (
        <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: log.action === 'stage_advanced' ? 'rgba(34,192,122,0.15)' : log.action === 'stage_sent_back' ? 'rgba(242,90,90,0.15)' : 'rgba(79,127,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: log.action === 'stage_advanced' ? 'var(--green)' : log.action === 'stage_sent_back' ? 'var(--red)' : 'var(--accent)',
          }}>
            {ACTION_ICONS[log.action] || '·'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>
              <span style={{ fontWeight: 700, color: 'var(--text1)' }}>{log.actor?.name || 'System'}</span>
              {' '}{log.action?.replace(/_/g, ' ')}
              {log.details?.from_stage && log.details?.to_stage && (
                <span style={{ color: 'var(--text3)', fontSize: 12 }}> · {log.details.from_stage} → {log.details.to_stage}</span>
              )}
            </div>
            {log.details?.reason && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 2 }}>Reason: {log.details.reason}</div>
            )}
            {log.details?.note && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{log.details.note}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{relTime(log.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CONDITION REPORT LAUNCHER — Creates a condition report for this job
// ═══════════════════════════════════════════════════════════════════
function ConditionReportLauncher({ project, profile }: { project: any; profile: any }) {
  const [creating, setCreating] = useState(false)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fd = (project.form_data as any) || {}

  const create = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/condition-reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          vehicle_year: fd.vehicleYear || fd.year || '',
          vehicle_make: fd.vehicleMake || fd.make || '',
          vehicle_model: fd.vehicleModel || fd.model || '',
          vehicle_color: fd.vehicleColor || fd.color || '',
          customer_name: fd.client || fd.customerName || '',
          customer_email: fd.email || '',
          customer_phone: fd.phone || '',
        }),
      })
      const json = await res.json()
      if (json.report?.report_token) {
        setReportUrl(`${window.location.origin}/condition-report/${json.report.report_token}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const copyLink = () => {
    if (!reportUrl) return
    navigator.clipboard.writeText(reportUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <ClipboardCheck size={14} color='#22d3ee' />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Vehicle Condition Report
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
        Document pre-existing damage before installation. Send to customer for review and e-signature.
      </div>
      {!reportUrl ? (
        <button
          onClick={create}
          disabled={creating}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8, color: '#22d3ee', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          {creating
            ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <ClipboardCheck size={13} />
          }
          {creating ? 'Creating...' : 'Create Condition Report'}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reportUrl}
          </div>
          <button
            onClick={copyLink}
            style={{ padding: '8px 14px', background: copied ? 'var(--green)' : 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ProjectDetail
