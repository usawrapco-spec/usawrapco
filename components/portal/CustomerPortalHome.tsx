'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Home, FolderKanban, Receipt, Palette, Star, Share2,
  Bell, ChevronRight, CheckCircle2, CreditCard, Package,
  ShieldCheck, MapPin, CalendarCheck, ThumbsUp, Clock,
  AlertTriangle, Loader2, Copy, Mail, Smartphone,
  Award, Gift, Crown, Sparkles, ArrowLeft,
} from 'lucide-react'

interface CustomerPortalHomeProps {
  token: string
}

interface IntakeToken {
  id: string
  org_id: string
  project_id: string | null
  token: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  created_at: string
}

interface ProjectData {
  id: string
  title: string
  vehicle_desc: string | null
  pipe_stage: string
  status: string
  type: string | null
  created_at: string
  install_date: string | null
  revenue: number | null
  customer_id: string | null
}

interface InvoiceData {
  id: string
  invoice_number: number
  title: string
  total: number
  balance_due: number
  status: string
  due_date: string | null
}

interface ProofData {
  id: string
  project_id: string
  image_url: string
  version_number: number
  customer_status: string
  designer_notes: string | null
  created_at: string
  project_title: string
}

interface MockupData {
  id: string
  business_name: string | null
  vehicle_type: string | null
  style_preference: string | null
  mockup_urls: string[] | null
  payment_status: string
  created_at: string
}

interface ReferralCodeData {
  id: string
  code: string
  affiliate_unlocked: boolean | null
  affiliate_commission_pct: number | null
}

interface ReferralTrackingData {
  id: string
  referred_by_name: string | null
  status: string
  conversion_value: number | null
  commission_paid: number | null
  created_at: string
}

interface RedemptionData {
  id: string
  points_redeemed: number
  dollar_value: number
  status: string
  created_at: string
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const colors = {
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
}

const stageColors: Record<string, { bg: string; text: string; label: string }> = {
  sales_in:    { bg: `${colors.accent}20`, text: colors.accent, label: 'Quoting' },
  production:  { bg: `${colors.purple}20`, text: colors.purple, label: 'In Production' },
  install:     { bg: `${colors.cyan}20`,   text: colors.cyan,   label: 'Installing' },
  prod_review: { bg: `${colors.amber}20`,  text: colors.amber,  label: 'Quality Check' },
  sales_close: { bg: `${colors.amber}20`,  text: colors.amber,  label: 'Wrapping Up' },
  done:        { bg: `${colors.green}20`,  text: colors.green,  label: 'Complete' },
}

const CUSTOMER_STAGES = [
  { key: 'received',        label: 'Received',         icon: CheckCircle2 },
  { key: 'deposit_paid',    label: 'Deposit Paid',     icon: CreditCard },
  { key: 'in_design',       label: 'In Design',        icon: Palette },
  { key: 'design_approved', label: 'Design Approved',  icon: ThumbsUp },
  { key: 'in_production',   label: 'In Production',    icon: Package },
  { key: 'quality_check',   label: 'Quality Check',    icon: ShieldCheck },
  { key: 'ready_pickup',    label: 'Ready for Pickup', icon: MapPin },
  { key: 'complete',        label: 'Complete',          icon: CalendarCheck },
]

function getTimelineIndex(pipeStage: string): number {
  const map: Record<string, number> = {
    sales_in: 1, production: 4, install: 5, prod_review: 5, sales_close: 6, done: 7,
  }
  return map[pipeStage] ?? 0
}

const PIPE_ORDER = ['sales_in', 'production', 'install', 'prod_review', 'sales_close', 'done']

interface LoyaltyTier {
  key: string
  label: string
  color: string
  minSpend: number
  icon: typeof Star
  benefits: string[]
}

const TIERS: LoyaltyTier[] = [
  { key: 'bronze',   label: 'Bronze',   color: '#cd7f32', minSpend: 0,     icon: Award,  benefits: ['Standard service'] },
  { key: 'silver',   label: 'Silver',   color: '#c0c0c0', minSpend: 5000,  icon: Star,   benefits: ['Free design revision', 'Priority scheduling'] },
  { key: 'gold',     label: 'Gold',     color: '#f59e0b', minSpend: 15000, icon: Gift,   benefits: ['Free removal on next job', 'Dedicated account manager'] },
  { key: 'platinum', label: 'Platinum', color: '#8b5cf6', minSpend: 30000, icon: Crown,  benefits: ['5% discount all jobs', 'Free ceramic coating annually'] },
]

type TabView = 'home' | 'jobs' | 'invoices' | 'designs' | 'loyalty' | 'referrals' | 'job-detail'

// ─── Component ──────────────────────────────────────────────────────────────────
export default function CustomerPortalHome({ token }: CustomerPortalHomeProps) {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [intake, setIntake] = useState<IntakeToken | null>(null)
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [proofs, setProofs] = useState<ProofData[]>([])
  const [mockups, setMockups] = useState<MockupData[]>([])
  const [referralCode, setReferralCode] = useState<ReferralCodeData | null>(null)
  const [referrals, setReferrals] = useState<ReferralTrackingData[]>([])
  const [redemptions, setRedemptions] = useState<RedemptionData[]>([])

  const [activeTab, setActiveTab] = useState<TabView>('home')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // ─── Computed ─────────────────────────────────────────────────────
  const customerName = intake?.customer_name || 'Welcome'
  const activeProjects = projects.filter(p => p.pipe_stage !== 'done')
  const pendingProofs = proofs.filter(p => p.customer_status === 'pending')
  const openInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'void')
  const totalBalance = openInvoices.reduce((sum, i) => sum + (i.balance_due || 0), 0)

  const lifetimeSpend = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0)
  const pointsEarned = Math.floor(lifetimeSpend)
  const pointsRedeemed = redemptions.reduce((sum, r) => sum + r.points_redeemed, 0)
  const pointsBalance = pointsEarned - pointsRedeemed
  const currentTier = [...TIERS].reverse().find(t => lifetimeSpend >= t.minSpend) || TIERS[0]
  const nextTier = TIERS.find(t => t.minSpend > lifetimeSpend)

  const referralLink = referralCode ? `portal.usawrapco.com/ref/${referralCode.code}` : ''

  // ─── Helpers ──────────────────────────────────────────────────────
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const progress = (stage: string) => { const idx = PIPE_ORDER.indexOf(stage); return idx < 0 ? 0 : ((idx + 1) / PIPE_ORDER.length) * 100 }

  const buildTimeline = (project: ProjectData) => {
    const currentIdx = getTimelineIndex(project.pipe_stage)
    return CUSTOMER_STAGES.map((stage, i) => ({
      ...stage,
      date: i <= currentIdx ? (i === 0 ? project.created_at : null) : null,
      completed: i < currentIdx,
      current: i === currentIdx,
    }))
  }

  // ─── Data Loading ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Look up intake token
      const { data: intakeData, error: intakeErr } = await supabase
        .from('customer_intake_tokens')
        .select('*')
        .eq('token', token)
        .single()

      if (intakeErr || !intakeData) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setIntake(intakeData)

      // 2. Load linked project to get customer_id
      let customerId: string | null = null
      if (intakeData.project_id) {
        const { data: proj } = await supabase
          .from('projects')
          .select('id, title, vehicle_desc, pipe_stage, status, type, created_at, install_date, revenue, customer_id')
          .eq('id', intakeData.project_id)
          .single()
        if (proj?.customer_id) {
          customerId = proj.customer_id
        }
      }

      if (!customerId) {
        setLoading(false)
        return
      }

      // 3. Load all customer projects
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, title, vehicle_desc, pipe_stage, status, type, created_at, install_date, revenue, customer_id')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (projectData) setProjects(projectData)

      // 4. Load invoices
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, invoice_number, title, total, balance_due, status, due_date')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (invoiceData) setInvoices(invoiceData)

      // 5. Load design proofs for all projects
      const projectIds = (projectData || []).map(p => p.id)
      if (projectIds.length > 0) {
        const { data: proofData } = await supabase
          .from('design_proofs')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
        if (proofData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setProofs(proofData.map((p: any) => ({
            id: p.id,
            project_id: p.project_id,
            image_url: p.image_url || p.file_url || p.thumbnail_url || '',
            version_number: p.version_number ?? p.version ?? 1,
            customer_status: p.customer_status || p.status || 'pending',
            designer_notes: p.designer_notes || null,
            created_at: p.created_at,
            project_title: (projectData || []).find(pr => pr.id === p.project_id)?.title || 'Project',
          })))
        }
      }

      // 6. Load design mockups
      const { data: mockupData } = await supabase
        .from('design_mockups')
        .select('id, business_name, vehicle_type, style_preference, mockup_urls, payment_status, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (mockupData) setMockups(mockupData)

      // 7. Load referral code
      const { data: refCode } = await supabase
        .from('referral_codes')
        .select('id, code, affiliate_unlocked, affiliate_commission_pct')
        .eq('owner_id', customerId)
        .eq('type', 'customer')
        .limit(1)
        .maybeSingle()
      if (refCode) {
        setReferralCode(refCode)
        // 8. Load referral tracking
        const { data: refTracking } = await supabase
          .from('referral_tracking')
          .select('id, referred_by_name, status, conversion_value, commission_paid, created_at')
          .eq('referral_code_id', refCode.id)
          .order('created_at', { ascending: false })
        if (refTracking) setReferrals(refTracking)
      }

      // 9. Load loyalty redemptions
      const { data: redemptionData } = await supabase
        .from('loyalty_redemptions')
        .select('id, points_redeemed, dollar_value, status, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (redemptionData) setRedemptions(redemptionData)

    } catch (err) {
      console.error('Portal load error:', err)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  // ─── Actions ──────────────────────────────────────────────────────
  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(`https://${referralLink}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} style={{ color: colors.accent, animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: colors.text3, marginTop: 12 }}>Loading your portal...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(79,127,255,0.4); } 50% { opacity: 0.7; box-shadow: 0 0 12px 4px rgba(79,127,255,0.15); } }`}</style>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <AlertTriangle size={40} style={{ color: colors.amber, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 22, fontWeight: 900, color: colors.text1, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>Portal Link Not Found</div>
          <div style={{ fontSize: 14, color: colors.text3, lineHeight: 1.6 }}>This portal link may have expired or is invalid. Please contact your wrap specialist for a new link.</div>
        </div>
      </div>
    )
  }

  const selectedJob = projects.find(p => p.id === selectedJobId)
  const selectedTimeline = selectedJob ? buildTimeline(selectedJob) : []
  const TierIcon = currentTier.icon

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text1, fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 80 }}>

      {/* ── Top Nav ──────────────────────────────────────────────── */}
      <div style={{
        background: colors.surface, borderBottom: `1px solid ${colors.border}`,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>USA WRAP CO</div>
          <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: colors.text1, marginTop: 1 }}>Customer Portal</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            padding: '4px 10px', borderRadius: 20,
            background: `${currentTier.color}15`, border: `1px solid ${currentTier.color}40`,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <TierIcon size={12} style={{ color: currentTier.color }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: currentTier.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{currentTier.label}</span>
          </div>
          {(pendingProofs.length > 0 || openInvoices.length > 0) && (
            <div style={{ position: 'relative', padding: 6 }}>
              <Bell size={18} style={{ color: colors.text2 }} />
              <span style={{
                position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%',
                background: colors.red, color: '#fff', fontSize: 8, fontWeight: 900,
                fontFamily: "'JetBrains Mono', monospace",
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{pendingProofs.length + openInvoices.length}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

        {/* ── HOME ───────────────────────────────────────────────── */}
        {activeTab === 'home' && (
          <>
            <div style={{
              background: `linear-gradient(135deg, ${colors.accent}15, ${colors.purple}10)`,
              border: `1px solid ${colors.border}`, borderRadius: 18, padding: '28px 24px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif" }}>Welcome, {customerName}</div>
              <div style={{ fontSize: 14, color: colors.text2, marginTop: 4 }}>
                {activeProjects.length > 0
                  ? `You have ${activeProjects.length} active project${activeProjects.length > 1 ? 's' : ''}`
                  : 'Track your wrap projects and manage everything here.'}
              </div>
            </div>

            {pendingProofs.length > 0 && (
              <div
                onClick={() => setActiveTab('designs')}
                style={{
                  background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12,
                  padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                }}
              >
                <Palette size={20} style={{ color: colors.amber, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.amber }}>
                    {pendingProofs.length} design proof{pendingProofs.length > 1 ? 's' : ''} awaiting your review
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: colors.amber }} />
              </div>
            )}

            {openInvoices.length > 0 && (
              <div
                onClick={() => setActiveTab('invoices')}
                style={{
                  background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.25)', borderRadius: 12,
                  padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                }}
              >
                <Receipt size={20} style={{ color: colors.green, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.green }}>
                    {money(totalBalance)} balance due across {openInvoices.length} invoice{openInvoices.length > 1 ? 's' : ''}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: colors.green }} />
              </div>
            )}

            {activeProjects.slice(0, 3).map(project => {
              const sc = stageColors[project.pipe_stage] || stageColors.sales_in
              return (
                <div
                  key={project.id}
                  onClick={() => { setSelectedJobId(project.id); setActiveTab('job-detail') }}
                  style={{
                    background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14,
                    padding: '18px 20px', marginBottom: 12, cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif" }}>{project.title}</div>
                      {project.vehicle_desc && <div style={{ fontSize: 12, color: colors.text2, marginTop: 2 }}>{project.vehicle_desc}</div>}
                    </div>
                    <div style={{
                      padding: '3px 10px', borderRadius: 20, background: sc.bg,
                      fontSize: 10, fontWeight: 800, color: sc.text, textTransform: 'uppercase',
                      letterSpacing: '0.04em', whiteSpace: 'nowrap',
                    }}>{sc.label}</div>
                  </div>
                  <div style={{ height: 4, background: colors.surface2, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: `linear-gradient(90deg, ${colors.accent}, ${colors.purple})`,
                      width: `${progress(project.pipe_stage)}%`, transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: colors.text3 }}>Started {fmt(project.created_at)}</span>
                    {project.install_date && <span style={{ fontSize: 10, color: colors.cyan }}>Install: {fmt(project.install_date)}</span>}
                  </div>
                </div>
              )
            })}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 8 }}>
              {([
                { label: 'My Jobs', icon: FolderKanban, color: colors.accent, tab: 'jobs' as TabView },
                { label: 'Designs', icon: Palette, color: colors.purple, tab: 'designs' as TabView },
                { label: 'Invoices', icon: Receipt, color: colors.green, tab: 'invoices' as TabView },
                { label: 'Loyalty', icon: Star, color: colors.amber, tab: 'loyalty' as TabView },
                { label: 'Referrals', icon: Share2, color: colors.cyan, tab: 'referrals' as TabView },
              ]).map(link => (
                <div
                  key={link.label}
                  onClick={() => setActiveTab(link.tab)}
                  style={{
                    background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12,
                    padding: '18px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: `${link.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <link.icon size={18} style={{ color: link.color }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{link.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── JOBS ───────────────────────────────────────────────── */}
        {activeTab === 'jobs' && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 16 }}>My Jobs</div>
            {projects.length === 0
              ? <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.text3, fontSize: 13 }}>No projects yet.</div>
              : projects.map(project => {
                  const sc = stageColors[project.pipe_stage] || stageColors.sales_in
                  return (
                    <div
                      key={project.id}
                      onClick={() => { setSelectedJobId(project.id); setActiveTab('job-detail') }}
                      style={{
                        background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14,
                        padding: '16px 18px', marginBottom: 10, cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif" }}>{project.title}</div>
                          {project.vehicle_desc && <div style={{ fontSize: 11, color: colors.text2, marginTop: 2 }}>{project.vehicle_desc}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            padding: '3px 10px', borderRadius: 20, background: sc.bg,
                            fontSize: 10, fontWeight: 800, color: sc.text, textTransform: 'uppercase',
                          }}>{sc.label}</div>
                          <ChevronRight size={14} style={{ color: colors.text3 }} />
                        </div>
                      </div>
                      <div style={{ height: 3, background: colors.surface2, borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
                        <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${colors.accent}, ${colors.purple})`, width: `${progress(project.pipe_stage)}%` }} />
                      </div>
                    </div>
                  )
                })
            }
          </>
        )}

        {/* ── JOB DETAIL ─────────────────────────────────────────── */}
        {activeTab === 'job-detail' && selectedJob && (
          <>
            <button
              onClick={() => setActiveTab('jobs')}
              style={{
                background: 'none', border: 'none', color: colors.accent, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0,
              }}
            >
              <ArrowLeft size={14} /> Back to Jobs
            </button>

            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif" }}>{selectedJob.title}</div>
              {selectedJob.vehicle_desc && <div style={{ fontSize: 13, color: colors.text2, marginTop: 4 }}>{selectedJob.vehicle_desc}</div>}
              <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                {selectedJob.type && <div style={{ fontSize: 11, color: colors.text3 }}><span style={{ color: colors.text2, fontWeight: 600 }}>Type:</span> {selectedJob.type}</div>}
                <div style={{ fontSize: 11, color: colors.text3 }}><span style={{ color: colors.text2, fontWeight: 600 }}>Created:</span> {fmt(selectedJob.created_at)}</div>
                {selectedJob.install_date && <div style={{ fontSize: 11, color: colors.cyan }}><span style={{ fontWeight: 600 }}>Install:</span> {fmt(selectedJob.install_date)}</div>}
              </div>
            </div>

            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: colors.text2 }}>Progress Timeline</div>
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
              {selectedTimeline.map((stage, i) => {
                const StageIcon = CUSTOMER_STAGES[i].icon
                const isCompleted = stage.completed
                const isCurrent = stage.current
                const isFuture = !isCompleted && !isCurrent
                return (
                  <div key={stage.key} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                    {i < CUSTOMER_STAGES.length - 1 && (
                      <div style={{
                        position: 'absolute', left: 13, top: 28, width: 2, height: 'calc(100% - 4px)',
                        background: isCompleted ? colors.green : colors.surface2,
                      }} />
                    )}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: isCompleted ? `${colors.green}20` : isCurrent ? `${colors.accent}20` : colors.surface2,
                      border: `2px solid ${isCompleted ? colors.green : isCurrent ? colors.accent : colors.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: isCurrent ? 'pulse 2s ease-in-out infinite' : 'none',
                    }}>
                      <StageIcon size={13} style={{ color: isCompleted ? colors.green : isCurrent ? colors.accent : colors.text3 }} />
                    </div>
                    <div style={{ paddingBottom: i < CUSTOMER_STAGES.length - 1 ? 20 : 0, flex: 1 }}>
                      <div style={{
                        fontSize: 13, fontWeight: isCurrent ? 800 : 600,
                        color: isFuture ? colors.text3 : colors.text1,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {stage.label}
                        {isCurrent && (
                          <span style={{
                            fontSize: 8, fontWeight: 900, padding: '2px 6px', borderRadius: 4,
                            background: `${colors.accent}20`, color: colors.accent,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>CURRENT</span>
                        )}
                      </div>
                      {stage.date && <div style={{ fontSize: 10, color: colors.text3, marginTop: 2 }}>{fmt(stage.date)}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── INVOICES ───────────────────────────────────────────── */}
        {activeTab === 'invoices' && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>Invoices</div>
            {totalBalance > 0 && (
              <div style={{ fontSize: 13, color: colors.text2, marginBottom: 16 }}>
                Total balance: <span style={{ color: colors.green, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{money(totalBalance)}</span>
              </div>
            )}
            {invoices.length === 0
              ? <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.text3, fontSize: 13 }}>No invoices yet.</div>
              : invoices.map(inv => {
                  const isPaid = inv.status === 'paid'
                  const isOverdue = !isPaid && inv.due_date && new Date(inv.due_date) < new Date()
                  const statusColor = isPaid ? colors.green : isOverdue ? colors.red : colors.amber
                  const statusLabel = isPaid ? 'Paid' : isOverdue ? 'Overdue' : inv.status === 'draft' ? 'Draft' : 'Unpaid'
                  return (
                    <div key={inv.id} style={{
                      background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12,
                      padding: '16px 18px', marginBottom: 10,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>#{inv.invoice_number} — {inv.title || 'Invoice'}</div>
                          {inv.due_date && <div style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>Due {fmt(inv.due_date)}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: isPaid ? colors.text3 : colors.text1 }}>
                            {money(inv.total)}
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: statusColor, textTransform: 'uppercase', marginTop: 2 }}>{statusLabel}</div>
                        </div>
                      </div>
                      {!isPaid && inv.balance_due > 0 && (
                        <div style={{
                          marginTop: 10, padding: '8px 12px', background: `${colors.green}08`,
                          border: `1px solid ${colors.green}20`, borderRadius: 8,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <span style={{ fontSize: 12, color: colors.text2 }}>
                            Balance: <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: colors.green }}>{money(inv.balance_due)}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })
            }
          </>
        )}

        {/* ── DESIGNS ────────────────────────────────────────────── */}
        {activeTab === 'designs' && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 16 }}>Designs</div>

            {proofs.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Design Proofs</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {proofs.map(proof => {
                    const isPending = proof.customer_status === 'pending'
                    const isApproved = proof.customer_status === 'approved'
                    return (
                      <div key={proof.id} style={{
                        background: colors.surface, border: `1px solid ${isPending ? `${colors.amber}40` : colors.border}`,
                        borderRadius: 10, overflow: 'hidden',
                      }}>
                        {proof.image_url && (
                          <img src={proof.image_url} alt={`Proof v${proof.version_number}`} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                        )}
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: colors.text2 }}>v{proof.version_number}</span>
                            <span style={{
                              fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
                              background: isApproved ? `${colors.green}20` : isPending ? `${colors.amber}20` : `${colors.red}20`,
                              color: isApproved ? colors.green : isPending ? colors.amber : colors.red,
                            }}>
                              {proof.customer_status}
                            </span>
                          </div>
                          {proof.project_title && <div style={{ fontSize: 10, color: colors.text3, marginTop: 4 }}>{proof.project_title}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {mockups.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>AI Mockups</div>
                {mockups.map(m => (
                  <div key={m.id} style={{
                    background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12,
                    padding: '14px 16px', marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.business_name || 'Mockup'}</div>
                        <div style={{ fontSize: 11, color: colors.text3 }}>{[m.vehicle_type, m.style_preference].filter(Boolean).join(' · ')}</div>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4,
                        background: m.payment_status === 'paid' ? `${colors.green}20` : `${colors.amber}20`,
                        color: m.payment_status === 'paid' ? colors.green : colors.amber,
                      }}>{m.payment_status}</span>
                    </div>
                    {m.payment_status === 'paid' && m.mockup_urls && m.mockup_urls.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(m.mockup_urls.length, 3)}, 1fr)`, gap: 6 }}>
                        {m.mockup_urls.map((url, i) => (
                          <img key={i} src={url} alt={`Mockup ${i + 1}`} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 6 }} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {proofs.length === 0 && mockups.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.text3, fontSize: 13 }}>No designs yet. Check back once your project is in design.</div>
            )}
          </>
        )}

        {/* ── LOYALTY ────────────────────────────────────────────── */}
        {activeTab === 'loyalty' && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 16 }}>Loyalty Program</div>

            <div style={{
              background: colors.surface, border: `1px solid ${currentTier.color}40`, borderRadius: 16,
              padding: '24px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${currentTier.color}, ${currentTier.color}60)` }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: `${currentTier.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TierIcon size={22} style={{ color: currentTier.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: currentTier.color }}>{currentTier.label} Member</div>
                  <div style={{ fontSize: 11, color: colors.text3 }}>Lifetime spend: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.text2 }}>{money(lifetimeSpend)}</span></div>
                </div>
              </div>
              {nextTier && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.text3, marginBottom: 4 }}>
                    <span>{currentTier.label}</span>
                    <span>{nextTier.label} — {money(nextTier.minSpend)}</span>
                  </div>
                  <div style={{ height: 6, background: colors.surface2, borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 6, background: currentTier.color,
                      width: `${Math.min(100, ((lifetimeSpend - currentTier.minSpend) / (nextTier.minSpend - currentTier.minSpend)) * 100)}%`,
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: colors.text3, marginTop: 4 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.text2 }}>{money(nextTier.minSpend - lifetimeSpend)}</span> to {nextTier.label}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Lifetime Spend', value: money(lifetimeSpend), color: colors.text1 },
                { label: 'Points Balance', value: pointsBalance.toLocaleString(), color: colors.accent },
                { label: 'Points Earned', value: pointsEarned.toLocaleString(), color: colors.green },
              ].map(stat => (
                <div key={stat.label} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Tier Benefits</div>
            {TIERS.map(tier => {
              const isActive = tier.key === currentTier.key
              const isLocked = tier.minSpend > lifetimeSpend
              const TIcon = tier.icon
              return (
                <div key={tier.key} style={{
                  background: isActive ? `${tier.color}08` : colors.surface,
                  border: `1px solid ${isActive ? `${tier.color}40` : colors.border}`, borderRadius: 10,
                  padding: '12px 16px', marginBottom: 8, opacity: isLocked ? 0.5 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <TIcon size={14} style={{ color: tier.color }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: tier.color }}>{tier.label}</span>
                    {tier.minSpend > 0 && !isActive && <span style={{ fontSize: 10, color: colors.text3, marginLeft: 'auto' }}>{money(tier.minSpend)}+</span>}
                    {isActive && <span style={{ fontSize: 8, fontWeight: 900, padding: '2px 6px', borderRadius: 4, background: `${tier.color}20`, color: tier.color, marginLeft: 'auto' }}>CURRENT</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tier.benefits.map(b => (
                      <span key={b} style={{ fontSize: 10, color: colors.text2, padding: '2px 8px', background: colors.surface2, borderRadius: 4 }}>{b}</span>
                    ))}
                  </div>
                </div>
              )
            })}

            {redemptions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Redemption History</div>
                {redemptions.map(r => (
                  <div key={r.id} style={{
                    background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8,
                    padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{r.points_redeemed} points → {money(r.dollar_value)}</div>
                      <div style={{ fontSize: 10, color: colors.text3, marginTop: 2 }}>{fmt(r.created_at)}</div>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
                      background: r.status === 'applied' ? `${colors.green}20` : r.status === 'approved' ? `${colors.accent}20` : `${colors.amber}20`,
                      color: r.status === 'applied' ? colors.green : r.status === 'approved' ? colors.accent : colors.amber,
                    }}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── REFERRALS ──────────────────────────────────────────── */}
        {activeTab === 'referrals' && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 16 }}>Refer a Friend</div>

            <div style={{
              background: colors.surface, border: `1px solid ${colors.cyan}30`, borderRadius: 14, padding: 20, marginBottom: 16,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Your Referral Link</div>
              {referralCode ? (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                    background: colors.bg, borderRadius: 8, border: `1px solid ${colors.border}`, marginBottom: 12,
                  }}>
                    <span style={{ flex: 1, fontSize: 12, color: colors.cyan, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {referralLink}
                    </span>
                    <button onClick={copyReferralLink} style={{
                      background: `${colors.cyan}15`, border: `1px solid ${colors.cyan}30`, borderRadius: 6,
                      padding: '6px 10px', cursor: 'pointer', color: colors.cyan, fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                    }}>
                      <Copy size={12} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={`sms:?body=Check out USA Wrap Co for your vehicle wrap! https://${referralLink}`} style={{
                      flex: 1, padding: 10, background: `${colors.green}10`, border: `1px solid ${colors.green}30`,
                      borderRadius: 8, color: colors.green, fontSize: 12, fontWeight: 700, textAlign: 'center',
                      textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <Smartphone size={14} /> Text
                    </a>
                    <a href={`mailto:?subject=Check out USA Wrap Co&body=Get your vehicle wrapped by the best! https://${referralLink}`} style={{
                      flex: 1, padding: 10, background: `${colors.accent}10`, border: `1px solid ${colors.accent}30`,
                      borderRadius: 8, color: colors.accent, fontSize: 12, fontWeight: 700, textAlign: 'center',
                      textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <Mail size={14} /> Email
                    </a>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: colors.text3, padding: '12px 0' }}>No referral code assigned yet. Contact your wrap specialist to get started.</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Referrals', value: referrals.length.toString(), color: colors.cyan },
                { label: 'Converted', value: referrals.filter(r => r.status === 'converted' || r.status === 'paid').length.toString(), color: colors.green },
                { label: 'Earned', value: money(referrals.reduce((sum, r) => sum + (r.commission_paid || 0), 0)), color: colors.amber },
              ].map(stat => (
                <div key={stat.label} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {referralCode?.affiliate_unlocked && (
              <div style={{
                background: `${colors.purple}08`, border: `1px solid ${colors.purple}30`, borderRadius: 12,
                padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Sparkles size={20} style={{ color: colors.purple }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.purple }}>Affiliate Status Active</div>
                  <div style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>{referralCode.affiliate_commission_pct || 5}% commission on referred customers first jobs</div>
                </div>
              </div>
            )}

            {referrals.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Referral History</div>
                {referrals.map(ref => (
                  <div key={ref.id} style={{
                    background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8,
                    padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{ref.referred_by_name || 'Referral'}</div>
                      <div style={{ fontSize: 10, color: colors.text3, marginTop: 2 }}>{fmt(ref.created_at)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
                        background: (ref.status === 'converted' || ref.status === 'paid') ? `${colors.green}20` : `${colors.amber}20`,
                        color: (ref.status === 'converted' || ref.status === 'paid') ? colors.green : colors.amber,
                      }}>{ref.status}</span>
                      {ref.commission_paid != null && ref.commission_paid > 0 && (
                        <div style={{ fontSize: 10, color: colors.green, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>+{money(ref.commission_paid)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 12 }}>How It Works</div>
              {[
                { step: '1', title: 'Share your link', desc: 'Send your unique referral link to friends and family' },
                { step: '2', title: 'They get a quote', desc: 'Your referral contacts USA Wrap Co for a free estimate' },
                { step: '3', title: 'They get wrapped', desc: 'Once their project is completed and paid for' },
                { step: '4', title: 'You get rewarded', desc: '$100 credit per conversion, plus affiliate earnings' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: `${colors.cyan}15`, border: `1px solid ${colors.cyan}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: 11, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: colors.cyan,
                  }}>{item.step}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      {/* ── Bottom Mobile Nav ────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: colors.surface, borderTop: `1px solid ${colors.border}`,
        display: 'flex', justifyContent: 'space-around', padding: '8px 0 12px', zIndex: 50,
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}>
        {([
          { key: 'home' as TabView, label: 'Home', icon: Home },
          { key: 'jobs' as TabView, label: 'Jobs', icon: FolderKanban },
          { key: 'designs' as TabView, label: 'Designs', icon: Palette },
          { key: 'invoices' as TabView, label: 'Invoices', icon: Receipt },
          { key: 'loyalty' as TabView, label: 'Rewards', icon: Star },
        ]).map(nav => {
          const isActive = activeTab === nav.key || (nav.key === 'jobs' && activeTab === 'job-detail') || (nav.key === 'loyalty' && activeTab === 'referrals')
          return (
            <button
              key={nav.key}
              onClick={() => setActiveTab(nav.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}
            >
              <nav.icon size={20} style={{ color: isActive ? colors.accent : colors.text3 }} />
              <span style={{ fontSize: 9, fontWeight: isActive ? 800 : 600, color: isActive ? colors.accent : colors.text3 }}>{nav.label}</span>
            </button>
          )
        })}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(79,127,255,0.4); } 50% { opacity: 0.7; box-shadow: 0 0 12px 4px rgba(79,127,255,0.15); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
