'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Home, FolderKanban, Receipt, Palette, Star, Share2,
  Bell, ChevronRight, CheckCircle2, CreditCard, Package,
  ShieldCheck, MapPin, CalendarCheck, ThumbsUp, Clock,
  AlertTriangle, Loader2, Copy, Mail, Smartphone,
  Award, Gift, Crown, Sparkles, ArrowLeft, Camera,
  Wrench, RefreshCw, MessageSquare, Image, FileText,
  Car, Truck, Plus, Upload, X, CheckCheck,
  Shield, ArrowRight, ChevronDown, Anchor, Send,
  ZoomIn, AlertCircle, Info,
} from 'lucide-react'

interface CustomerPortalHomeProps { token: string }

// ─── Types ────────────────────────────────────────────────────────────────────
interface IntakeToken {
  id: string; org_id: string; project_id: string | null; token: string
  customer_name: string | null; customer_email: string | null; customer_phone: string | null; created_at: string
}
interface ProjectData {
  id: string; title: string; vehicle_desc: string | null; pipe_stage: string; status: string
  type: string | null; created_at: string; install_date: string | null; revenue: number | null
  customer_id: string | null; warranty_years: number | null; warranty_expiry: string | null
  install_completed_date: string | null
}
interface InvoiceData {
  id: string; invoice_number: number; title: string; total: number; balance_due: number; status: string; due_date: string | null
}
interface ProofData {
  id: string; project_id: string; image_url: string; version_number: number
  customer_status: string; designer_notes: string | null; created_at: string; project_title: string
}
interface ReferralCodeData { id: string; code: string; affiliate_unlocked: boolean; affiliate_commission_pct: number | null }
interface ReferralTrackingData { id: string; created_at: string; status: string; converted_amount: number | null }
interface CustomerVehicle {
  id: string; customer_id: string; year: string | null; make: string | null; model: string | null
  vehicle_type: string | null; nickname: string | null; photo_url: string | null; is_primary: boolean
  wrap_info: { color?: string; install_date?: string; warranty_expiry?: string } | null
  services_done: { project_id: string; service_type: string; date: string }[]
}
interface MaintenanceTicket {
  id: string; ticket_token: string; ticket_type: string; status: string; subject: string
  description: string | null; photos: string[]; ai_assessment: string | null; ai_severity: string | null
  ai_recommended_action: string | null; is_warranty_eligible: boolean; warranty_expiry: string | null
  created_at: string
}
interface CustomerNotification {
  id: string; type: string; title: string; message: string | null; action_url: string | null
  action_label: string | null; is_read: boolean; created_at: string
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', purple: '#8b5cf6', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}
const stageColors: Record<string, { bg: string; text: string; label: string }> = {
  sales_in:    { bg: `${C.accent}20`,  text: C.accent,  label: 'Quoting' },
  production:  { bg: `${C.purple}20`, text: C.purple, label: 'In Production' },
  install:     { bg: `${C.cyan}20`,   text: C.cyan,   label: 'Installing' },
  prod_review: { bg: `${C.amber}20`,  text: C.amber,  label: 'Quality Check' },
  sales_close: { bg: `${C.amber}20`,  text: C.amber,  label: 'Wrapping Up' },
  done:        { bg: `${C.green}20`,  text: C.green,  label: 'Complete' },
}
const PIPE_ORDER = ['sales_in', 'production', 'install', 'prod_review', 'sales_close', 'done']
function pipeProgress(stage: string) { const i = PIPE_ORDER.indexOf(stage); return i < 0 ? 0 : ((i + 1) / PIPE_ORDER.length) * 100 }

const TIERS = [
  { key: 'bronze',   label: 'Bronze',   color: '#cd7f32', minSpend: 0,     icon: Award },
  { key: 'silver',   label: 'Silver',   color: '#c0c0c0', minSpend: 5000,  icon: Star },
  { key: 'gold',     label: 'Gold',     color: '#f59e0b', minSpend: 15000, icon: Gift },
  { key: 'platinum', label: 'Platinum', color: '#8b5cf6', minSpend: 30000, icon: Crown },
]

type View = 'home' | 'jobs' | 'maintenance' | 'book' | 'photos' | 'documents' | 'referrals' | 'vehicles'

const NAV_ITEMS: { key: View; label: string; icon: typeof Home }[] = [
  { key: 'home',        label: 'Home',        icon: Home },
  { key: 'jobs',        label: 'My Jobs',      icon: FolderKanban },
  { key: 'maintenance', label: 'Maintenance',  icon: Wrench },
  { key: 'book',        label: 'Book Service', icon: RefreshCw },
  { key: 'photos',      label: 'Photos',       icon: Image },
  { key: 'documents',   label: 'Documents',    icon: FileText },
  { key: 'referrals',   label: 'Referrals',    icon: Share2 },
  { key: 'vehicles',    label: 'My Vehicles',  icon: Car },
]

const POPULAR_SERVICES = [
  { id: 'full_wrap',      label: 'Full Wrap',        desc: 'Complete vehicle coverage', price: 'From $2,400' },
  { id: 'partial_wrap',   label: 'Partial Wrap',     desc: 'Hood, roof, doors, or custom', price: 'From $800' },
  { id: 'ppf_front',      label: 'PPF Front End',    desc: 'Hood, fenders, bumper protection', price: 'From $1,200' },
  { id: 'window_tint',    label: 'Window Tint',      desc: 'UV + privacy protection', price: 'From $280' },
  { id: 'chrome_delete',  label: 'Chrome Delete',    desc: 'Gloss black or satin finish', price: 'From $350' },
  { id: 'dekwave',        label: 'DekWave Decking',  desc: 'Marine boat decking', price: 'From $2,000' },
]

const AFFECTED_AREAS = ['Hood', 'Roof', 'Driver Door', 'Passenger Door', 'Rear', 'Front Bumper', 'Rear Bumper', 'Side Panels', 'Trunk', 'Other']
const ISSUE_TYPES = [
  'Peeling / lifting edges',
  'Bubbling / air pockets',
  'Fading / discoloration',
  'Physical damage (chip, scratch, tear)',
  'Vinyl cracking',
  'Other',
]

// ─── Upload helper ─────────────────────────────────────────────────────────────
async function uploadPhoto(file: File, customerId: string): Promise<string | null> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `portal-issues/${customerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('project-files').upload(path, file, { upsert: true })
  if (error) { console.error('Upload error:', error); return null }
  const { data } = supabase.storage.from('project-files').getPublicUrl(path)
  return data.publicUrl
}

// ─── HealthCheck component ─────────────────────────────────────────────────────
function HealthCheck({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<string | null>(null)

  const questions = [
    {
      q: 'When you look at the edges, do you see any lifting?',
      opts: ['No, all edges look flat and sealed', 'Minor lifting in 1-2 spots', 'Significant lifting in multiple areas'],
    },
    {
      q: 'Any bubbles or air pockets?',
      opts: ['None at all', '1-2 small bubbles', 'Multiple bubbles'],
    },
    {
      q: 'Has the color changed or faded?',
      opts: ['Looks the same as when installed', 'Very slight change, normal aging', 'Noticeable color shift or fading'],
    },
    {
      q: 'Any physical damage (cuts, tears, rock chips)?',
      opts: ['No damage', 'Minor damage (small chip or scratch)', 'Significant damage'],
    },
  ]

  const score = Object.values(answers).reduce((a, b) => a + b, 0)

  function assess() {
    if (score <= 1) setResult('great')
    else if (score <= 4) setResult('minor')
    else setResult('urgent')
  }

  if (result) {
    const resultMap = {
      great:  { color: C.green,  icon: CheckCheck, title: 'Your wrap looks great!', msg: 'Everything checks out. Book a free annual inspection to catch anything early and keep your warranty current.' },
      minor:  { color: C.amber,  icon: AlertCircle, title: 'A few things to check', msg: 'We noticed a couple of things worth a quick look. Schedule a free inspection and we can take care of it fast.' },
      urgent: { color: C.red,    icon: AlertTriangle, title: 'Your wrap needs attention', msg: 'Based on your answers, we recommend getting in soon. Some issues get worse over time. Book a service appointment.' },
    }[result]!
    const Icon = resultMap.icon
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${resultMap.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Icon size={32} color={resultMap.color} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text1, marginBottom: 8 }}>{resultMap.title}</div>
        <div style={{ color: C.text2, marginBottom: 24, lineHeight: 1.5 }}>{resultMap.msg}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: C.accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Book Inspection
          </button>
          <button onClick={onClose} style={{ padding: '10px 20px', background: C.surface2, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    )
  }

  const q = questions[step]
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ fontSize: 13, color: C.text3, marginBottom: 4 }}>Question {step + 1} of {questions.length}</div>
      <div style={{ height: 4, background: C.surface2, borderRadius: 2, marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${((step + 1) / questions.length) * 100}%`, background: C.accent, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, color: C.text1, marginBottom: 20 }}>{q.q}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {q.opts.map((opt, i) => (
          <button
            key={i}
            onClick={() => {
              const next = { ...answers, [step]: i }
              setAnswers(next)
              if (step < questions.length - 1) setStep(step + 1)
              else { setAnswers(next); setTimeout(assess, 100) }
            }}
            style={{
              padding: '14px 16px', background: answers[step] === i ? `${C.accent}20` : C.surface2,
              border: `1px solid ${answers[step] === i ? C.accent : C.border}`,
              borderRadius: 10, cursor: 'pointer', color: answers[step] === i ? C.accent : C.text2,
              textAlign: 'left', fontSize: 15, fontWeight: answers[step] === i ? 600 : 400, transition: 'all 0.15s',
            }}
          >{opt}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CustomerPortalHome({ token }: CustomerPortalHomeProps) {
  const supabase = createClient()

  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [intake, setIntake]     = useState<IntakeToken | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [proofs, setProofs]     = useState<ProofData[]>([])
  const [referralCode, setReferralCode] = useState<ReferralCodeData | null>(null)
  const [referrals, setReferrals] = useState<ReferralTrackingData[]>([])
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([])
  const [tickets, setTickets]   = useState<MaintenanceTicket[]>([])
  const [notifications, setNotifications] = useState<CustomerNotification[]>([])
  const [jobPhotos, setJobPhotos] = useState<{ id: string; photo_url: string; photo_type: string; project_title: string }[]>([])

  const [view, setView]         = useState<View>('home')
  const [notifOpen, setNotifOpen] = useState(false)
  const [healthCheck, setHealthCheck] = useState(false)
  const [copied, setCopied]     = useState(false)

  // ─── Maintenance flow state ────────────────────────────────────────────────
  const [mainStep, setMainStep] = useState<'list' | 'select-vehicle' | 'describe' | 'result'>('list')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [mainPhotos, setMainPhotos] = useState<string[]>([])
  const [mainAreas, setMainAreas]   = useState<string[]>([])
  const [mainIssueType, setMainIssueType] = useState('')
  const [mainDesc, setMainDesc]     = useState('')
  const [mainUrgency, setMainUrgency] = useState('not-urgent')
  const [mainSubmitting, setMainSubmitting] = useState(false)
  const [mainResult, setMainResult] = useState<Record<string, unknown> | null>(null)
  const mainPhotoRef = useRef<HTMLInputElement>(null)

  // ─── Reorder flow state ───────────────────────────────────────────────────
  const [reorderStep, setReorderStep] = useState<'select' | 'services' | 'details' | 'result'>('select')
  const [reorderVehicle, setReorderVehicle] = useState<string | null>(null)
  const [reorderServices, setReorderServices] = useState<string[]>([])
  const [reorderNotes, setReorderNotes]   = useState('')
  const [reorderUrgency, setReorderUrgency] = useState('flexible')
  const [reorderPhotos, setReorderPhotos] = useState<string[]>([])
  const [reorderSubmitting, setReorderSubmitting] = useState(false)
  const [reorderResult, setReorderResult] = useState<Record<string, unknown> | null>(null)
  const reorderPhotoRef = useRef<HTMLInputElement>(null)

  // ─── Computed ────────────────────────────────────────────────────────────
  const customerName   = intake?.customer_name?.split(' ')[0] || 'there'
  const activeProjects = projects.filter(p => p.pipe_stage !== 'done')
  const doneProjects   = projects.filter(p => p.pipe_stage === 'done')
  const unreadNotifs   = notifications.filter(n => !n.is_read).length
  const lifetimeSpend  = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const currentTier    = [...TIERS].reverse().find(t => lifetimeSpend >= t.minSpend) || TIERS[0]
  const referralLink   = referralCode ? `https://usawrapco.com/shop?ref=${referralCode.code}` : ''
  const openInvoices   = invoices.filter(i => i.status !== 'paid' && i.status !== 'void')
  const totalBalance   = openInvoices.reduce((s, i) => s + (i.balance_due || 0), 0)
  const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const fmt   = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  function warrantyActive(expiry: string | null) {
    if (!expiry) return false
    return new Date() < new Date(expiry)
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: intakeData, error: intakeErr } = await supabase
        .from('customer_intake').select('*').eq('token', token).single()
      if (intakeErr || !intakeData) { setNotFound(true); setLoading(false); return }
      setIntake(intakeData)

      let cid: string | null = null
      if (intakeData.project_id) {
        const { data: proj } = await supabase.from('projects')
          .select('id, customer_id').eq('id', intakeData.project_id).single()
        if (proj?.customer_id) cid = proj.customer_id
      }
      if (!cid) { setLoading(false); return }
      setCustomerId(cid)

      const [
        { data: projData }, { data: invData }, { data: refCode },
        { data: refTracking }, { data: vehicleData }, { data: ticketData },
        { data: notifData },
      ] = await Promise.all([
        supabase.from('projects')
          .select('id, title, vehicle_desc, pipe_stage, status, type, created_at, install_date, revenue, customer_id, warranty_years, warranty_expiry, install_completed_date')
          .eq('customer_id', cid).order('created_at', { ascending: false }),
        supabase.from('invoices')
          .select('id, invoice_number, title, total, balance_due, status, due_date')
          .eq('customer_id', cid).order('created_at', { ascending: false }),
        supabase.from('referral_codes')
          .select('id, code, affiliate_unlocked, affiliate_commission_pct')
          .eq('owner_id', cid).maybeSingle(),
        supabase.from('referral_tracking')
          .select('id, created_at, status, converted_amount')
          .eq('referrer_id', cid).order('created_at', { ascending: false }),
        supabase.from('customer_vehicles')
          .select('*').eq('customer_id', cid).order('is_primary', { ascending: false }),
        supabase.from('maintenance_tickets')
          .select('id, ticket_token, ticket_type, status, subject, description, photos, ai_assessment, ai_severity, ai_recommended_action, is_warranty_eligible, warranty_expiry, created_at')
          .eq('customer_id', cid).order('created_at', { ascending: false }),
        supabase.from('customer_notifications')
          .select('*').eq('customer_id', cid).order('created_at', { ascending: false }).limit(20),
      ])

      if (projData) setProjects(projData)
      if (invData) setInvoices(invData)
      if (refCode) setReferralCode(refCode)
      if (refTracking) setReferrals(refTracking)
      if (vehicleData) setVehicles(vehicleData)
      if (ticketData) setTickets(ticketData)
      if (notifData) setNotifications(notifData)

      // Load design proofs
      const projectIds = (projData || []).map(p => p.id)
      if (projectIds.length > 0) {
        const { data: proofData } = await supabase.from('design_proofs')
          .select('*').in('project_id', projectIds).order('created_at', { ascending: false })
        if (proofData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setProofs(proofData.map((p: any) => ({
            id: p.id, project_id: p.project_id,
            image_url: p.image_url || p.file_url || p.thumbnail_url || '',
            version_number: p.version_number ?? 1,
            customer_status: p.customer_status || 'pending',
            designer_notes: p.designer_notes || null, created_at: p.created_at,
            project_title: (projData || []).find(pr => pr.id === p.project_id)?.title || 'Project',
          })))
        }

        // Load job photos
        const { data: jpData } = await supabase.from('job_photos')
          .select('id, photo_url, photo_type, project_id')
          .in('project_id', projectIds).order('created_at', { ascending: false })
        if (jpData) {
          setJobPhotos(jpData.map((jp: { id: string; photo_url: string; photo_type: string; project_id: string }) => ({
            id: jp.id, photo_url: jp.photo_url, photo_type: jp.photo_type,
            project_title: (projData || []).find(pr => pr.id === jp.project_id)?.title || 'Project',
          })))
        }
      }
    } catch (e) {
      console.error('Portal load error:', e)
    } finally {
      setLoading(false)
    }
  }, [token, supabase])

  useEffect(() => { loadData() }, [loadData])

  // ─── Maintenance submit ────────────────────────────────────────────────────
  async function submitMaintenanceReport() {
    setMainSubmitting(true)
    try {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId)
      const project = vehicle
        ? projects.find(p => (vehicle.services_done || []).some((s) => s.project_id === p.id))
        : projects[0]

      const res = await fetch('/api/portal/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          org_id: intake?.org_id,
          original_project_id: project?.id || null,
          ticket_type: 'issue_report',
          subject: `${vehicle ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}` : 'Vehicle'} — ${mainIssueType || 'Issue Report'}`.trim(),
          description: mainDesc,
          photos: mainPhotos,
          affected_areas: mainAreas,
          vehicle_year: vehicle?.year,
          vehicle_make: vehicle?.make,
          vehicle_model: vehicle?.model,
          install_date: project?.install_completed_date || project?.install_date,
          warranty_years: project?.warranty_years || 5,
        }),
      })
      const data = await res.json()
      setMainResult(data)
      setMainStep('result')
      loadData()
    } catch (e) {
      console.error('Submit error:', e)
    } finally {
      setMainSubmitting(false)
    }
  }

  // ─── Reorder submit ────────────────────────────────────────────────────────
  async function submitReorder() {
    setReorderSubmitting(true)
    try {
      const vehicle = vehicles.find(v => v.id === reorderVehicle)
      const res = await fetch('/api/portal/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          org_id: intake?.org_id,
          services_requested: reorderServices,
          vehicle_year: vehicle?.year,
          vehicle_make: vehicle?.make,
          vehicle_model: vehicle?.model,
          is_same_vehicle: !!reorderVehicle,
          urgency: reorderUrgency,
          notes: reorderNotes,
          photos: reorderPhotos,
        }),
      })
      const data = await res.json()
      setReorderResult(data)
      setReorderStep('result')
    } catch (e) {
      console.error('Reorder error:', e)
    } finally {
      setReorderSubmitting(false)
    }
  }

  // ─── Shared photo upload ───────────────────────────────────────────────────
  async function handlePhotoFiles(files: FileList | null, setter: (urls: string[]) => void, existing: string[]) {
    if (!files || !customerId) return
    const uploads = await Promise.all(Array.from(files).map(f => uploadPhoto(f, customerId)))
    setter([...existing, ...uploads.filter(Boolean) as string[]])
  }

  // ─── Mark notifications read ───────────────────────────────────────────────
  async function markAllRead() {
    if (!customerId) return
    await supabase.from('customer_notifications').update({ is_read: true }).eq('customer_id', customerId).eq('is_read', false)
    setNotifications(n => n.map(x => ({ ...x, is_read: true })))
  }

  // ─── Render helpers ────────────────────────────────────────────────────────
  const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', ...extra }}>
      {children}
    </div>
  )

  const chip = (text: string, color: string) => (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: `${color}20`, color, letterSpacing: 0.5 }}>
      {text}
    </span>
  )

  const vehicleIcon = (type: string | null) => type === 'boat' ? Anchor : type === 'truck' ? Truck : Car

  // ─── Loading / Not Found ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color={C.accent} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <AlertTriangle size={48} color={C.red} style={{ marginBottom: 16 }} />
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text1, marginBottom: 8 }}>Portal not found</div>
      <div style={{ color: C.text2 }}>This link may have expired or been removed.</div>
    </div>
  )

  // ─── VIEWS ────────────────────────────────────────────────────────────────

  const renderHome = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Greeting */}
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text1 }}>Hey {customerName}!</div>
        <div style={{ color: C.text2, marginTop: 4 }}>Welcome to your USA Wrap Co portal.</div>
      </div>

      {/* Active jobs */}
      {activeProjects.map(p => {
        const sc = stageColors[p.pipe_stage] || stageColors.sales_in
        const prog = pipeProgress(p.pipe_stage)
        return card(
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 4 }}>ACTIVE JOB</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.text1 }}>{p.title}</div>
                {p.vehicle_desc && <div style={{ color: C.text2, fontSize: 14, marginTop: 2 }}>{p.vehicle_desc}</div>}
              </div>
              {chip(sc.label, sc.text)}
            </div>
            <div style={{ height: 6, background: C.surface2, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${prog}%`, background: sc.text, borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
            <button onClick={() => setView('jobs')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 }}>
              View Details <ChevronRight size={14} />
            </button>
          </div>
        )
      })}

      {/* Balance due */}
      {totalBalance > 0 && card(
        <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 4 }}>BALANCE DUE</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.amber }}>{money(totalBalance)}</div>
          </div>
          <button onClick={() => setView('documents')} style={{ padding: '10px 18px', background: C.amber, color: '#000', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            Pay Now
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 12 }}>QUICK ACTIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { icon: Camera,     label: 'Report Issue',  action: () => { setView('maintenance'); setMainStep('select-vehicle') } },
            { icon: RefreshCw,  label: 'Book Service',  action: () => setView('book') },
            { icon: MessageSquare, label: 'Messages',   action: () => {} },
            { icon: FileText,   label: 'Invoices',      action: () => setView('documents') },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer' }}>
              <Icon size={22} color={C.accent} />
              <span style={{ fontSize: 11, color: C.text2, fontWeight: 600, textAlign: 'center' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles */}
      {vehicles.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 12 }}>YOUR VEHICLES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vehicles.map(v => {
              const VIcon = vehicleIcon(v.vehicle_type)
              const wActive = warrantyActive(v.wrap_info?.warranty_expiry || null)
              return card(
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <VIcon size={20} color={C.text2} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: C.text1 }}>{v.nickname || `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim() || 'Vehicle'}</div>
                      <div style={{ fontSize: 13, color: C.text2 }}>{v.year} {v.make} {v.model}</div>
                      {wActive && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Shield size={12} color={C.green} />
                          <span style={{ fontSize: 12, color: C.green }}>Warranty active until {v.wrap_info?.warranty_expiry ? fmt(v.wrap_info.warranty_expiry) : 'N/A'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setSelectedVehicleId(v.id); setView('maintenance'); setMainStep('describe') }}
                      style={{ flex: 1, padding: '8px 0', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.text2, fontSize: 13, fontWeight: 600 }}>
                      Report Issue
                    </button>
                    <button onClick={() => { setReorderVehicle(v.id); setView('book'); setReorderStep('services') }}
                      style={{ flex: 1, padding: '8px 0', background: `${C.accent}15`, border: `1px solid ${C.accent}40`, borderRadius: 8, cursor: 'pointer', color: C.accent, fontSize: 13, fontWeight: 600 }}>
                      Book Service
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Annual health check */}
      {!healthCheck && card(
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.purple}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={22} color={C.purple} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: C.text1, marginBottom: 2 }}>Annual Wrap Health Check</div>
              <div style={{ fontSize: 13, color: C.text2 }}>Takes 2 minutes. Catch issues early and keep your warranty valid.</div>
            </div>
          </div>
          <button onClick={() => setHealthCheck(true)} style={{ marginTop: 16, width: '100%', padding: '12px 0', background: `${C.purple}20`, border: `1px solid ${C.purple}40`, borderRadius: 10, cursor: 'pointer', color: C.purple, fontWeight: 700, fontSize: 15 }}>
            Start Health Check
          </button>
        </div>
      )}
      {healthCheck && card(
        <div>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: C.text1 }}>Wrap Health Check</div>
            <button onClick={() => setHealthCheck(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3 }}><X size={18} /></button>
          </div>
          <HealthCheck onClose={() => setHealthCheck(false)} />
        </div>
      )}
    </div>
  )

  const renderJobs = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>My Jobs</div>
      {activeProjects.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text3, letterSpacing: 1 }}>ACTIVE</div>
          {activeProjects.map(p => {
            const sc = stageColors[p.pipe_stage] || stageColors.sales_in
            return card(
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.text1, fontSize: 16 }}>{p.title}</div>
                    {p.vehicle_desc && <div style={{ color: C.text2, fontSize: 14 }}>{p.vehicle_desc}</div>}
                  </div>
                  {chip(sc.label, sc.text)}
                </div>
                <div style={{ height: 6, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pipeProgress(p.pipe_stage)}%`, background: sc.text, borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
        </>
      )}

      {doneProjects.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text3, letterSpacing: 1 }}>COMPLETED</div>
          {doneProjects.map(p => card(
            <div style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.text1, marginBottom: 4 }}>{p.title}</div>
              {p.vehicle_desc && <div style={{ color: C.text2, fontSize: 14, marginBottom: 4 }}>{p.vehicle_desc}</div>}
              {(p.install_completed_date || p.install_date) && (
                <div style={{ fontSize: 13, color: C.text3 }}>Completed {fmt(p.install_completed_date || p.install_date || p.created_at)}</div>
              )}
              {p.warranty_expiry && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <Shield size={12} color={warrantyActive(p.warranty_expiry) ? C.green : C.text3} />
                  <span style={{ fontSize: 12, color: warrantyActive(p.warranty_expiry) ? C.green : C.text3 }}>
                    Warranty {warrantyActive(p.warranty_expiry) ? `active until ${fmt(p.warranty_expiry)}` : 'expired'}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => { setView('maintenance'); setMainStep('select-vehicle') }}
                  style={{ padding: '8px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.text2, fontSize: 13, fontWeight: 600 }}>
                  Report Issue
                </button>
                <button onClick={() => setView('book')}
                  style={{ padding: '8px 14px', background: `${C.accent}15`, border: `1px solid ${C.accent}40`, borderRadius: 8, cursor: 'pointer', color: C.accent, fontSize: 13, fontWeight: 600 }}>
                  Book Again
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: C.text3 }}>
          <FolderKanban size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>No jobs yet</div>
        </div>
      )}
    </div>
  )

  const renderMaintenance = () => {
    if (mainStep === 'select-vehicle') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setMainStep('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text2, padding: 0 }}><ArrowLeft size={22} /></button>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>Select Vehicle</div>
        </div>
        {vehicles.map(v => {
          const VIcon = vehicleIcon(v.vehicle_type)
          return (
            <button key={v.id} onClick={() => { setSelectedVehicleId(v.id); setMainStep('describe') }}
              style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 18, background: selectedVehicleId === v.id ? `${C.accent}10` : C.surface, border: `1px solid ${selectedVehicleId === v.id ? C.accent : C.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <VIcon size={24} color={C.text2} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: C.text1 }}>{v.nickname || `${v.year} ${v.make} ${v.model}`}</div>
                {v.wrap_info?.install_date && <div style={{ fontSize: 13, color: C.text2 }}>Wrapped {fmt(v.wrap_info.install_date)}</div>}
              </div>
              <ChevronRight size={16} color={C.text3} />
            </button>
          )
        })}
        {projects.filter(p => p.pipe_stage === 'done').map(p => (
          <button key={p.id} onClick={() => { setSelectedVehicleId(p.id); setMainStep('describe') }}
            style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 18, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <Car size={24} color={C.text2} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: C.text1 }}>{p.vehicle_desc || p.title}</div>
              <div style={{ fontSize: 13, color: C.text2 }}>From: {p.title}</div>
            </div>
            <ChevronRight size={16} color={C.text3} />
          </button>
        ))}
        <button onClick={() => setMainStep('describe')} style={{ padding: 16, background: C.surface2, border: `1px dashed ${C.border}`, borderRadius: 14, cursor: 'pointer', color: C.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600 }}>
          <Plus size={18} /> A different vehicle
        </button>
      </div>
    )

    if (mainStep === 'describe') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setMainStep('select-vehicle')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text2, padding: 0 }}><ArrowLeft size={22} /></button>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>Describe the Issue</div>
        </div>

        {/* Photo upload */}
        <div>
          <div style={{ fontWeight: 600, color: C.text1, marginBottom: 8 }}>Photos <span style={{ color: C.accent, fontSize: 13 }}>— helps us diagnose faster</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {mainPhotos.map((url, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setMainPhotos(ps => ps.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: 4, right: 4, background: '#00000080', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {mainPhotos.length < 6 && (
              <button onClick={() => mainPhotoRef.current?.click()}
                style={{ aspectRatio: '1', borderRadius: 10, background: C.surface2, border: `1px dashed ${C.border}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: C.text3 }}>
                <Camera size={22} />
                <span style={{ fontSize: 11 }}>Add photo</span>
              </button>
            )}
          </div>
          <input ref={mainPhotoRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => handlePhotoFiles(e.target.files, setMainPhotos, mainPhotos)} />
        </div>

        {/* Affected areas */}
        <div>
          <div style={{ fontWeight: 600, color: C.text1, marginBottom: 10 }}>Affected areas <span style={{ fontSize: 13, color: C.text2, fontWeight: 400 }}>(tap all that apply)</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AFFECTED_AREAS.map(area => (
              <button key={area} onClick={() => setMainAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])}
                style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${mainAreas.includes(area) ? C.accent : C.border}`, background: mainAreas.includes(area) ? `${C.accent}20` : C.surface2, color: mainAreas.includes(area) ? C.accent : C.text2, cursor: 'pointer', fontSize: 13, fontWeight: mainAreas.includes(area) ? 700 : 400 }}>
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Issue type */}
        <div>
          <div style={{ fontWeight: 600, color: C.text1, marginBottom: 10 }}>Type of issue</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ISSUE_TYPES.map(t => (
              <button key={t} onClick={() => setMainIssueType(t)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: mainIssueType === t ? `${C.accent}10` : C.surface2, border: `1px solid ${mainIssueType === t ? C.accent : C.border}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${mainIssueType === t ? C.accent : C.text3}`, background: mainIssueType === t ? C.accent : 'transparent', flexShrink: 0 }} />
                <span style={{ color: mainIssueType === t ? C.accent : C.text2, fontWeight: mainIssueType === t ? 600 : 400 }}>{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <div style={{ fontWeight: 600, color: C.text1, marginBottom: 8 }}>Additional details</div>
          <textarea value={mainDesc} onChange={e => setMainDesc(e.target.value)} placeholder="Tell us anything else that would help…"
            style={{ width: '100%', minHeight: 100, padding: '12px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text1, fontSize: 15, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <button onClick={submitMaintenanceReport} disabled={mainSubmitting}
          style={{ padding: '16px 0', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, cursor: mainSubmitting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: mainSubmitting ? 0.7 : 1 }}>
          {mainSubmitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing photos...</> : <><Send size={18} /> Submit Report</>}
        </button>
      </div>
    )

    if (mainStep === 'result' && mainResult) {
      const sev = mainResult.ai_severity as string
      const sevColor = { minor: C.green, moderate: C.amber, significant: C.red, warranty_eligible: C.green }[sev] || C.accent
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <CheckCheck size={48} color={C.green} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>Issue Submitted</div>
            <div style={{ color: C.text2, marginTop: 4 }}>We'll review your ticket within 24 hours.</div>
          </div>

          {mainResult.ai_assessment && card(
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 12 }}>AI ASSESSMENT</div>
              <div style={{ color: C.text1, lineHeight: 1.6, marginBottom: 16 }}>{mainResult.ai_assessment as string}</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ padding: '6px 14px', background: `${sevColor}20`, borderRadius: 20, color: sevColor, fontSize: 13, fontWeight: 700 }}>
                  Severity: {String(sev).replace('_', ' ')}
                </div>
                {mainResult.is_warranty_eligible && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.green, fontSize: 13, fontWeight: 600 }}>
                    <Shield size={14} /> Warranty eligible
                  </div>
                )}
              </div>
              {mainResult.ai_recommended_action && (
                <div style={{ marginTop: 14, padding: '12px 14px', background: C.surface2, borderRadius: 10, color: C.text2, fontSize: 14 }}>
                  <span style={{ color: C.text3, fontWeight: 600 }}>Recommended: </span>{mainResult.ai_recommended_action as string}
                </div>
              )}
            </div>
          )}

          <button onClick={() => { setMainStep('list'); setMainPhotos([]); setMainAreas([]); setMainIssueType(''); setMainDesc(''); setMainResult(null) }}
            style={{ padding: '14px 0', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, cursor: 'pointer', color: C.text2, fontWeight: 600 }}>
            Back to Maintenance
          </button>
        </div>
      )
    }

    // List view
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>Maintenance</div>
          <button onClick={() => setMainStep('select-vehicle')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            <Plus size={16} /> Report Issue
          </button>
        </div>

        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: C.text3 }}>
            <CheckCheck size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div>No issues reported</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Tap "Report Issue" if you notice something.</div>
          </div>
        ) : tickets.map(t => {
          const statusColors: Record<string, string> = { open: C.amber, reviewing: C.cyan, scheduled: C.accent, in_progress: C.purple, resolved: C.green, declined: C.red }
          const sc = statusColors[t.status] || C.text2
          return card(
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1, marginRight: 10 }}>
                  <div style={{ fontWeight: 700, color: C.text1, fontSize: 15 }}>{t.subject}</div>
                  <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{fmt(t.created_at)}</div>
                </div>
                {chip(t.status.replace('_', ' '), sc)}
              </div>
              {t.ai_assessment && <div style={{ color: C.text2, fontSize: 14, lineHeight: 1.5, marginBottom: 10 }}>{t.ai_assessment}</div>}
              {t.is_warranty_eligible && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.green, fontSize: 13, fontWeight: 600 }}>
                  <Shield size={14} /> Warranty eligible
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderBook = () => {
    if (reorderStep === 'result' && reorderResult) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <CheckCheck size={48} color={C.green} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>Request Sent!</div>
          <div style={{ color: C.text2, marginTop: 4 }}>We'll have a quote to you within 24 hours.</div>
        </div>
        {reorderResult.ai_quote_estimate && card(
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 10 }}>INSTANT ESTIMATE</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: C.green }}>{money(reorderResult.ai_quote_estimate as number)}</div>
            <div style={{ fontSize: 13, color: C.text3, marginBottom: 12 }}>Rough estimate — final quote may vary</div>
            {reorderResult.ai_quote_reasoning && <div style={{ color: C.text2, fontSize: 14, lineHeight: 1.5 }}>{reorderResult.ai_quote_reasoning as string}</div>}
          </div>
        )}
        <button onClick={() => { setReorderStep('select'); setReorderVehicle(null); setReorderServices([]); setReorderPhotos([]); setReorderResult(null) }}
          style={{ padding: '14px 0', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, cursor: 'pointer', color: C.text2, fontWeight: 600 }}>
          Start Another Request
        </button>
      </div>
    )

    if (reorderStep === 'services') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setReorderStep('select')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text2, padding: 0 }}><ArrowLeft size={22} /></button>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>Select Services</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {POPULAR_SERVICES.map(s => {
            const sel = reorderServices.includes(s.id)
            return (
              <button key={s.id} onClick={() => setReorderServices(prev => sel ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                style={{ padding: 16, background: sel ? `${C.accent}15` : C.surface, border: `1px solid ${sel ? C.accent : C.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: sel ? C.accent : C.text1, fontSize: 14, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 6 }}>{s.desc}</div>
                <div style={{ fontSize: 13, color: sel ? C.accent : C.text3, fontWeight: 600 }}>{s.price}</div>
              </button>
            )
          })}
        </div>
        {reorderServices.length > 0 && (
          <button onClick={() => setReorderStep('details')}
            style={{ padding: '14px 0', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Continue <ArrowRight size={18} />
          </button>
        )}
      </div>
    )

    if (reorderStep === 'details') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setReorderStep('services')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text2, padding: 0 }}><ArrowLeft size={22} /></button>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>Final Details</div>
        </div>

        <div>
          <div style={{ fontWeight: 600, color: C.text1, marginBottom: 8 }}>How soon do you need it?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['asap', 'ASAP — need it done quickly'], ['this_month', 'This month works'], ['flexible', 'No rush, flexible timeline']].map(([val, label]) => (
              <button key={val} onClick={() => setReorderUrgency(val)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: reorderUrgency === val ? `${C.accent}10` : C.surface2, border: `1px solid ${reorderUrgency === val ? C.accent : C.border}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${reorderUrgency === val ? C.accent : C.text3}`, background: reorderUrgency === val ? C.accent : 'transparent', flexShrink: 0 }} />
                <span style={{ color: reorderUrgency === val ? C.accent : C.text2, fontWeight: reorderUrgency === val ? 600 : 400 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, color: C.text1, marginBottom: 8 }}>Additional notes</div>
          <textarea value={reorderNotes} onChange={e => setReorderNotes(e.target.value)} placeholder="Anything else we should know…"
            style={{ width: '100%', minHeight: 80, padding: '12px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text1, fontSize: 15, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div>
          <div style={{ fontWeight: 600, color: C.text1, marginBottom: 8 }}>Add vehicle photos <span style={{ fontSize: 13, color: C.text2, fontWeight: 400 }}>— get an instant AI estimate</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {reorderPhotos.map((url, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setReorderPhotos(ps => ps.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: 4, right: 4, background: '#00000080', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {reorderPhotos.length < 6 && (
              <button onClick={() => reorderPhotoRef.current?.click()}
                style={{ aspectRatio: '1', borderRadius: 10, background: C.surface2, border: `1px dashed ${C.border}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: C.text3 }}>
                <Upload size={20} />
                <span style={{ fontSize: 11 }}>Add photo</span>
              </button>
            )}
          </div>
          <input ref={reorderPhotoRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => handlePhotoFiles(e.target.files, setReorderPhotos, reorderPhotos)} />
        </div>

        <button onClick={submitReorder} disabled={reorderSubmitting}
          style={{ padding: '16px 0', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, cursor: reorderSubmitting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: reorderSubmitting ? 0.7 : 1 }}>
          {reorderSubmitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Getting your quote…</> : <><Send size={18} /> Request Quote</>}
        </button>
      </div>
    )

    // Step 1 — Select vehicle
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>Book New Service</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 12 }}>SAME VEHICLE?</div>
          {vehicles.map(v => {
            const VIcon = vehicleIcon(v.vehicle_type)
            return (
              <button key={v.id} onClick={() => { setReorderVehicle(v.id); setReorderStep('services') }}
                style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 18, marginBottom: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <VIcon size={22} color={C.text2} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C.text1 }}>{v.nickname || `${v.year} ${v.make} ${v.model}`}</div>
                  {v.services_done?.length > 0 && <div style={{ fontSize: 13, color: C.text2 }}>Last service: {v.services_done[v.services_done.length - 1]?.service_type}</div>}
                </div>
                <ArrowRight size={16} color={C.accent} />
              </button>
            )
          })}
          <button onClick={() => { setReorderVehicle(null); setReorderStep('services') }}
            style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 18, background: C.surface2, border: `1px dashed ${C.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <Plus size={22} color={C.text3} />
            <div style={{ fontWeight: 600, color: C.text2 }}>A different vehicle</div>
          </button>
        </div>
      </div>
    )
  }

  const renderPhotos = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>My Photos</div>
      {jobPhotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: C.text3 }}>
          <Image size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>No photos yet</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {jobPhotos.map(p => (
            <div key={p.id} style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', position: 'relative', background: C.surface }}>
              <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, #000a)', padding: '8px 10px 6px' }}>
                <div style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{p.photo_type.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{p.project_title}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderDocuments = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>Documents</div>
      {invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: C.text3 }}>
          <FileText size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>No documents yet</div>
        </div>
      ) : invoices.map(inv => {
        const statusColor = { paid: C.green, sent: C.accent, overdue: C.red, draft: C.text3, void: C.text3 }[inv.status] || C.text2
        return card(
          <div key={inv.id} style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, color: C.text1 }}>Invoice #{inv.invoice_number}</div>
                <div style={{ fontSize: 14, color: C.text2 }}>{inv.title}</div>
                {inv.due_date && <div style={{ fontSize: 12, color: C.text3 }}>Due: {fmt(inv.due_date)}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: C.text1 }}>{money(inv.total)}</div>
                {chip(inv.status, statusColor)}
              </div>
            </div>
            {inv.balance_due > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: `${C.amber}15`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: C.amber, fontSize: 14, fontWeight: 600 }}>Balance due: {money(inv.balance_due)}</span>
                <button style={{ padding: '6px 14px', background: C.amber, color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Pay</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const renderReferrals = () => {
    const earned = referrals.filter(r => r.status === 'converted').reduce((s, r) => s + (r.converted_amount || 0), 0)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>Referrals</div>

        {card(
          <div style={{ padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: C.green }}>${(earned / 100).toFixed(0) === '0' ? '100' : earned}</div>
              <div style={{ color: C.text2, fontSize: 15 }}>credit earned per referral</div>
            </div>
            <div style={{ padding: '14px 16px', background: C.surface2, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.text3, marginBottom: 4 }}>YOUR REFERRAL LINK</div>
              <div style={{ fontFamily: 'monospace', color: C.accent, fontSize: 14, wordBreak: 'break-all' }}>{referralLink || 'usawrapco.com/shop?ref=YOUR_CODE'}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { if (referralLink) { navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000) } }}
                style={{ flex: 1, padding: '12px 0', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button onClick={() => referralLink && (window.location.href = `sms:?body=Get your vehicle wrapped at USA Wrap Co! ${referralLink}`)}
                style={{ flex: 1, padding: '12px 0', background: C.surface2, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Smartphone size={16} /> Share via SMS
              </button>
            </div>
          </div>
        )}

        {card(
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 16 }}>YOUR STATS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Links shared', val: '1' },
                { label: 'Jobs booked', val: referrals.filter(r => r.status === 'converted').length.toString() },
                { label: 'Credits earned', val: `$${earned}` },
              ].map(({ label, val }) => (
                <div key={label} style={{ textAlign: 'center', padding: '14px 8px', background: C.surface2, borderRadius: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>{val}</div>
                  <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderVehicles = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>My Vehicles</div>
      {vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: C.text3 }}>
          <Car size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>No vehicles saved yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Your vehicles will appear here as you work with us.</div>
        </div>
      ) : vehicles.map(v => {
        const VIcon = vehicleIcon(v.vehicle_type)
        const wActive = warrantyActive(v.wrap_info?.warranty_expiry || null)
        return card(
          <div key={v.id} style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <VIcon size={24} color={C.text2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: C.text1 }}>{v.nickname || `${v.year} ${v.make} ${v.model}`}</div>
                {v.nickname && <div style={{ color: C.text2, fontSize: 14 }}>{v.year} {v.make} {v.model}</div>}
                {v.wrap_info?.color && <div style={{ fontSize: 13, color: C.text3, marginTop: 4 }}>Color: {v.wrap_info.color}</div>}
              </div>
              {v.is_primary && chip('PRIMARY', C.accent)}
            </div>

            {v.wrap_info && (
              <div style={{ padding: '12px 14px', background: C.surface2, borderRadius: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, letterSpacing: 0.5, marginBottom: 8 }}>CURRENT WRAP</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    {v.wrap_info.install_date && <div style={{ fontSize: 13, color: C.text2 }}>Installed: {fmt(v.wrap_info.install_date)}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield size={12} color={wActive ? C.green : C.text3} />
                    <span style={{ fontSize: 12, color: wActive ? C.green : C.text3, fontWeight: 600 }}>
                      {wActive ? `Warranty active` : 'Warranty expired'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setSelectedVehicleId(v.id); setView('maintenance'); setMainStep('describe') }}
                style={{ flex: 1, padding: '10px 0', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', color: C.text2, fontSize: 13, fontWeight: 600 }}>
                Report Issue
              </button>
              <button onClick={() => { setReorderVehicle(v.id); setView('book'); setReorderStep('services') }}
                style={{ flex: 1, padding: '10px 0', background: `${C.accent}15`, border: `1px solid ${C.accent}40`, borderRadius: 10, cursor: 'pointer', color: C.accent, fontSize: 13, fontWeight: 600 }}>
                Book Service
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )

  const VIEWS: Record<View, () => React.ReactNode> = {
    home: renderHome, jobs: renderJobs, maintenance: renderMaintenance,
    book: renderBook, photos: renderPhotos, documents: renderDocuments,
    referrals: renderReferrals, vehicles: renderVehicles,
  }

  // ─── Header ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: '"Barlow Condensed", system-ui', fontWeight: 800, fontSize: 20, color: C.text1, letterSpacing: -0.5 }}>USA WRAP CO</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Tier badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: `${currentTier.color}20`, borderRadius: 20 }}>
            <currentTier.icon size={12} color={currentTier.color} />
            <span style={{ fontSize: 11, fontWeight: 700, color: currentTier.color }}>{currentTier.label}</span>
          </div>
          {/* Notifications */}
          <button onClick={() => { setNotifOpen(!notifOpen); if (unreadNotifs > 0) markAllRead() }}
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: C.text2, padding: 4 }}>
            <Bell size={22} />
            {unreadNotifs > 0 && (
              <div style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, background: C.red, borderRadius: '50%', fontSize: 10, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadNotifs}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Notification panel */}
      {notifOpen && (
        <div style={{ position: 'fixed', top: 60, right: 16, left: 16, zIndex: 100, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text1 }}>Notifications</div>
          {notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: C.text3 }}>All caught up!</div>
          ) : notifications.slice(0, 6).map(n => (
            <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: n.is_read ? 'transparent' : `${C.accent}08` }}>
              <div style={{ fontWeight: 600, color: C.text1, fontSize: 14 }}>{n.title}</div>
              {n.message && <div style={{ color: C.text2, fontSize: 13, marginTop: 2 }}>{n.message}</div>}
            </div>
          ))}
          <button onClick={() => setNotifOpen(false)} style={{ width: '100%', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', color: C.text2, fontWeight: 600 }}>Close</button>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 100px' }}>
        {VIEWS[view]?.()}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', overflowX: 'auto', zIndex: 50 }}>
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = view === key
          return (
            <button key={key} onClick={() => { setView(key); if (key === 'maintenance') setMainStep('list'); if (key === 'book') setReorderStep('select') }}
              style={{ flex: '1 0 auto', minWidth: 64, padding: '10px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
              <Icon size={20} color={active ? C.accent : C.text3} />
              <span style={{ fontSize: 10, color: active ? C.accent : C.text3, fontWeight: active ? 700 : 400 }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
