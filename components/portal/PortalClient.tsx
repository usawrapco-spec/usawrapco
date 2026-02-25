'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  FolderKanban,
  Image as ImageIcon,
  MessageSquare,
  LogOut,
  Car,
  CheckCircle2,
  Clock,
  Send,
  ThumbsUp,
  MessageCircle,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Eye,
  User,
  Bell,
  Home,
  Palette,
  Receipt,
  Gift,
  Star,
  Camera,
  Loader2,
  Circle,
  Package,
  ShieldCheck,
  MapPin,
  CalendarCheck,
} from 'lucide-react'

interface PortalClientProps {
  userId: string
  userEmail: string
  userName?: string
}

interface PortalProject {
  id: string
  title: string
  vehicle_desc: string | null
  pipe_stage: string
  status: string
  type: string | null
  created_at: string
  install_date: string | null
  revenue: number | null
}

interface PortalProof {
  id: string
  project_id: string
  project_title: string
  file_url: string
  version: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface PortalInvoice {
  id: string
  invoice_number: number
  title: string
  total: number
  balance_due: number
  status: string
  due_date: string | null
}

interface PortalFile {
  id: string
  file_name: string
  image_url: string
  category: string | null
  created_at: string
  project_id?: string
}

interface PortalMessage {
  id: string
  content: string
  sender_name: string
  sender_role: 'customer' | 'staff'
  created_at: string
}

interface PortalNotification {
  id: string
  title: string
  body: string
  read: boolean
  created_at: string
}

interface StageEvent {
  stage: string
  label: string
  date: string | null
  completed: boolean
  current: boolean
}

type PortalView = 'home' | 'jobs' | 'job-detail' | 'design' | 'invoices' | 'referrals' | 'loyalty' | 'messages'

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
  estimate:    { bg: `${colors.text3}20`,  text: colors.text3,  label: 'Estimate' },
}

const CUSTOMER_STAGES: { key: string; label: string; icon: typeof Circle }[] = [
  { key: 'received',       label: 'Received',         icon: CheckCircle2 },
  { key: 'deposit_paid',   label: 'Deposit Paid',     icon: CreditCard },
  { key: 'in_design',      label: 'In Design',        icon: Palette },
  { key: 'design_approved',label: 'Design Approved',  icon: ThumbsUp },
  { key: 'in_production',  label: 'In Production',    icon: Package },
  { key: 'quality_check',  label: 'Quality Check',    icon: ShieldCheck },
  { key: 'ready_pickup',   label: 'Ready for Pickup', icon: MapPin },
  { key: 'complete',       label: 'Complete',          icon: CalendarCheck },
]

function getTimelineIndex(pipeStage: string): number {
  const map: Record<string, number> = {
    sales_in: 1, production: 4, install: 5, prod_review: 5, sales_close: 6, done: 7,
  }
  return map[pipeStage] ?? 0
}

const PIPE_ORDER = ['sales_in', 'production', 'install', 'prod_review', 'sales_close', 'done']

export default function PortalClient({ userId, userEmail, userName }: PortalClientProps) {
  const [view, setView] = useState<PortalView>('home')
  const [projects, setProjects] = useState<PortalProject[]>([])
  const [proofs, setProofs] = useState<PortalProof[]>([])
  const [invoices, setInvoices] = useState<PortalInvoice[]>([])
  const [files, setFiles] = useState<PortalFile[]>([])
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [notifications, setNotifications] = useState<PortalNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const displayName = userName || userEmail.split('@')[0]

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, title, vehicle_desc, pipe_stage, status, type, created_at, install_date, revenue')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
      if (projectData) setProjects(projectData)

      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, invoice_number, title, total, balance_due, status, due_date')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
      if (invoiceData) setInvoices(invoiceData)

      const { data: proofData } = await supabase
        .from('design_proofs')
        .select('id, project_id, file_url, version, status, created_at, projects(title)')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
      if (proofData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProofs(proofData.map((p: any) => ({
          ...p,
          project_title: p.projects?.title || 'Untitled Project',
        })))
      }

      const projectIds = (projectData || []).map((p: PortalProject) => p.id)
      if (projectIds.length > 0) {
        const { data: fileData } = await supabase
          .from('job_images')
          .select('id, file_name, image_url, category, created_at, project_id')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(100)
        if (fileData) setFiles(fileData)

        const { data: commentData } = await supabase
          .from('job_comments')
          .select('id, body, author_name, created_at, project_id')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(50)
        if (commentData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMessages(commentData.map((c: any) => ({
            id: c.id,
            content: c.body,
            sender_name: c.author_name || 'USA Wrap Co',
            sender_role: 'staff' as const,
            created_at: c.created_at,
          })))
        }
      }

      const { data: notifData } = await supabase
        .from('notifications')
        .select('id, title, body, read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (notifData) setNotifications(notifData)
    } catch (err) {
      console.error('Portal load error:', err)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/portal/login')
  }

  const handleApproveProof = async (proofId: string) => {
    await supabase.from('design_proofs').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', proofId)
    setProofs(prev => prev.map(p => p.id === proofId ? { ...p, status: 'approved' } : p))
  }

  const submitProofFeedback = async () => {
    if (!feedbackId || !feedbackText.trim()) return
    await supabase.from('design_proofs').update({ status: 'rejected', feedback: feedbackText }).eq('id', feedbackId)
    setProofs(prev => prev.map(p => p.id === feedbackId ? { ...p, status: 'rejected' } : p))
    setFeedbackId(null)
    setFeedbackText('')
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || projects.length === 0) return
    const projectId = selectedJobId || projects[0].id
    await supabase.from('job_comments').insert({
      project_id: projectId, author_id: userId, author_name: displayName,
      body: newMessage, org_id: 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
    })
    setMessages(prev => [{ id: Date.now().toString(), content: newMessage, sender_name: 'You', sender_role: 'customer', created_at: new Date().toISOString() }, ...prev])
    setNewMessage('')
  }

  const markNotificationsRead = async () => {
    const unread = notifications.filter(n => !n.read)
    if (unread.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unread.map(n => n.id))
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const progress = (stage: string) => { const idx = PIPE_ORDER.indexOf(stage); return idx < 0 ? 0 : ((idx + 1) / PIPE_ORDER.length) * 100 }

  const unreadCount = notifications.filter(n => !n.read).length
  const activeProjects = projects.filter(p => p.pipe_stage !== 'done')
  const pendingProofs = proofs.filter(p => p.status === 'pending')
  const openInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'void')
  const selectedJob = projects.find(p => p.id === selectedJobId)
  const jobPhotos = files.filter(f => f.project_id === selectedJobId)

  const buildTimeline = (project: PortalProject): StageEvent[] => {
    const currentIdx = getTimelineIndex(project.pipe_stage)
    return CUSTOMER_STAGES.map((_stage, i) => ({
      stage: _stage.key, label: _stage.label,
      date: i <= currentIdx ? (i === 0 ? project.created_at : null) : null,
      completed: i < currentIdx, current: i === currentIdx,
    }))
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text1, fontFamily: "'Inter', sans-serif", paddingBottom: 80 }}>
      {/* Top Nav */}
      <div style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '-0.01em', color: colors.text1 }}>USA WRAP CO</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markNotificationsRead() }} style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, color: colors.text2 }}>
            <Bell size={20} />
            {unreadCount > 0 && <span style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: colors.red, color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${colors.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} style={{ color: colors.accent }} /></div>
          <button onClick={handleSignOut} style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '6px 12px', color: colors.text2, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><LogOut size={12} /> Sign Out</button>
        </div>
      </div>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div style={{ position: 'fixed', top: 56, right: 12, width: 320, maxHeight: 400, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, zIndex: 100, overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, fontSize: 13, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", color: colors.text1 }}>Notifications</div>
          {notifications.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: colors.text3 }}>No notifications yet</div>
            : notifications.map(n => (
              <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, opacity: n.read ? 0.6 : 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text1, marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: colors.text2 }}>{n.body}</div>
                <div style={{ fontSize: 10, color: colors.text3, marginTop: 4 }}>{fmt(n.created_at)}</div>
              </div>
            ))}
        </div>
      )}

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Loader2 size={32} style={{ color: colors.accent, animation: 'spin 1s linear infinite' }} /></div>
        ) : (
          <>
            {/* HOME */}
            {view === 'home' && (
              <>
                <div style={{ background: `linear-gradient(135deg, ${colors.accent}15, ${colors.purple}10)`, border: `1px solid ${colors.border}`, borderRadius: 18, padding: '28px 24px', marginBottom: 20 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>Welcome back, {displayName}</div>
                  <div style={{ fontSize: 14, color: colors.text2 }}>{activeProjects.length > 0 ? `You have ${activeProjects.length} active project${activeProjects.length > 1 ? 's' : ''}` : 'Track your wrap projects and manage everything here.'}</div>
                </div>

                {activeProjects.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Active Projects</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {activeProjects.slice(0, 3).map(p => {
                        const sc = stageColors[p.pipe_stage] || stageColors.estimate
                        const pct = progress(p.pipe_stage)
                        return (
                          <button key={p.id} onClick={() => { setSelectedJobId(p.id); setView('job-detail') }} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', textAlign: 'left', width: '100%', color: colors.text1, display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Car size={20} style={{ color: sc.text }} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                              {p.vehicle_desc && <div style={{ fontSize: 12, color: colors.text2, marginBottom: 6 }}>{p.vehicle_desc}</div>}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, height: 4, background: colors.surface2, borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: sc.text, borderRadius: 2 }} /></div>
                                <span style={{ fontSize: 10, fontWeight: 800, color: sc.text, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{sc.label}</span>
                              </div>
                            </div>
                            <ChevronRight size={18} style={{ color: colors.text3, flexShrink: 0 }} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
                  {([
                    { key: 'jobs' as PortalView, label: 'My Jobs', icon: FolderKanban, count: projects.length, color: colors.accent },
                    { key: 'design' as PortalView, label: 'Design Studio', icon: Palette, count: pendingProofs.length, color: colors.purple },
                    { key: 'invoices' as PortalView, label: 'Invoices', icon: Receipt, count: openInvoices.length, color: colors.green },
                    { key: 'referrals' as PortalView, label: 'Referrals', icon: Gift, count: 0, color: colors.cyan },
                    { key: 'loyalty' as PortalView, label: 'Loyalty', icon: Star, count: 0, color: colors.amber },
                    { key: 'messages' as PortalView, label: 'Messages', icon: MessageSquare, count: messages.length, color: colors.purple },
                  ]).map(link => (
                    <button key={link.key} onClick={() => setView(link.key)} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: '18px 16px', cursor: 'pointer', textAlign: 'left', color: colors.text1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${link.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><link.icon size={18} style={{ color: link.color }} /></div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{link.label}</div>
                        {link.count > 0 && <div style={{ fontSize: 11, color: colors.text3, fontFamily: "'JetBrains Mono', monospace" }}>{link.count} {link.count === 1 ? 'item' : 'items'}</div>}
                      </div>
                    </button>
                  ))}
                </div>

                {pendingProofs.length > 0 && (
                  <button onClick={() => setView('design')} style={{ width: '100%', background: `${colors.amber}10`, border: `1px solid ${colors.amber}30`, borderRadius: 14, padding: '16px 18px', cursor: 'pointer', color: colors.text1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <Palette size={22} style={{ color: colors.amber, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{pendingProofs.length} design proof{pendingProofs.length > 1 ? 's' : ''} awaiting your review</div><div style={{ fontSize: 12, color: colors.text2, marginTop: 2 }}>Tap to review and approve</div></div>
                    <ChevronRight size={18} style={{ color: colors.amber, flexShrink: 0 }} />
                  </button>
                )}
                {openInvoices.length > 0 && (
                  <button onClick={() => setView('invoices')} style={{ width: '100%', background: `${colors.green}08`, border: `1px solid ${colors.green}25`, borderRadius: 14, padding: '16px 18px', cursor: 'pointer', color: colors.text1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Receipt size={22} style={{ color: colors.green, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{openInvoices.length} open invoice{openInvoices.length > 1 ? 's' : ''}</div><div style={{ fontSize: 12, color: colors.text2, marginTop: 2 }}>Total due: {money(openInvoices.reduce((s, i) => s + (i.balance_due || 0), 0))}</div></div>
                    <ChevronRight size={18} style={{ color: colors.green, flexShrink: 0 }} />
                  </button>
                )}
              </>
            )}

            {/* MY JOBS */}
            {view === 'jobs' && (
              <>
                <ViewHeader title="My Jobs" onBack={() => setView('home')} />
                {projects.length === 0 ? <EmptyState icon={FolderKanban} message="No projects yet. Your wrap projects will appear here once created." /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {projects.map(p => {
                      const sc = stageColors[p.pipe_stage] || stageColors.estimate
                      const pct = progress(p.pipe_stage)
                      const thumb = files.find(f => f.project_id === p.id)
                      return (
                        <button key={p.id} onClick={() => { setSelectedJobId(p.id); setView('job-detail') }} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', textAlign: 'left', width: '100%', color: colors.text1 }}>
                          <div style={{ display: 'flex', gap: 14 }}>
                            <div style={{ width: 64, height: 64, borderRadius: 10, background: colors.surface2, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {thumb?.image_url ? <img src={thumb.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Car size={24} style={{ color: colors.text3 }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: sc.bg, color: sc.text, flexShrink: 0, marginLeft: 8 }}>{sc.label}</span>
                              </div>
                              {p.vehicle_desc && <div style={{ fontSize: 12, color: colors.text2, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}><Car size={12} /> {p.vehicle_desc}</div>}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 4, background: colors.surface2, borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? colors.green : colors.accent, borderRadius: 2 }} /></div>
                                <span style={{ fontSize: 10, color: colors.text3, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(pct)}%</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
                            <span style={{ fontSize: 11, color: colors.text3 }}>{p.type || 'Wrap'}</span>
                            {p.install_date && <span style={{ fontSize: 11, color: colors.amber, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> Install: {fmt(p.install_date)}</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* JOB DETAIL */}
            {view === 'job-detail' && selectedJob && (
              <>
                <ViewHeader title={selectedJob.title} onBack={() => setView('jobs')} />
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    {selectedJob.vehicle_desc && <div style={{ fontSize: 14, color: colors.text2, display: 'flex', alignItems: 'center', gap: 6 }}><Car size={15} /> {selectedJob.vehicle_desc}</div>}
                    <span style={{ padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800, background: (stageColors[selectedJob.pipe_stage] || stageColors.estimate).bg, color: (stageColors[selectedJob.pipe_stage] || stageColors.estimate).text }}>{(stageColors[selectedJob.pipe_stage] || stageColors.estimate).label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    {selectedJob.type && <div><div style={{ fontSize: 10, color: colors.text3, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em' }}>Type</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{selectedJob.type}</div></div>}
                    <div><div style={{ fontSize: 10, color: colors.text3, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em' }}>Created</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{fmt(selectedJob.created_at)}</div></div>
                    {selectedJob.install_date && <div><div style={{ fontSize: 10, color: colors.text3, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em' }}>Install</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: colors.amber }}>{fmt(selectedJob.install_date)}</div></div>}
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Project Timeline</div>
                  <div style={{ position: 'relative' }}>
                    {buildTimeline(selectedJob).map((stage, i, arr) => {
                      const StageIcon = CUSTOMER_STAGES[i].icon
                      const isLast = i === arr.length - 1
                      let nodeColor = colors.text3
                      let nodeBg = `${colors.text3}15`
                      if (stage.completed) { nodeColor = colors.green; nodeBg = `${colors.green}20` }
                      else if (stage.current) { nodeColor = colors.accent; nodeBg = `${colors.accent}20` }
                      return (
                        <div key={stage.stage} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                          {!isLast && <div style={{ position: 'absolute', left: 17, top: 36, bottom: 0, width: 2, background: stage.completed ? colors.green : colors.border }} />}
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: nodeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, ...(stage.current ? { boxShadow: `0 0 0 4px ${colors.accent}20`, animation: 'pulse 2s ease-in-out infinite' } : {}) }}>
                            <StageIcon size={16} style={{ color: nodeColor }} />
                          </div>
                          <div style={{ flex: 1, paddingBottom: isLast ? 0 : 24, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: stage.current ? 800 : 600, color: stage.completed || stage.current ? colors.text1 : colors.text3, marginBottom: 2 }}>
                              {stage.label}
                              {stage.current && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: `${colors.accent}20`, color: colors.accent }}>CURRENT</span>}
                            </div>
                            {stage.date && <div style={{ fontSize: 11, color: colors.text3 }}>{fmt(stage.date)}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Photos */}
                {jobPhotos.length > 0 && (
                  <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Camera size={14} /> Photos ({jobPhotos.length})</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {jobPhotos.slice(0, 9).map(photo => (
                        <div key={photo.id} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: colors.surface2 }}>
                          {photo.image_url ? <img src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} style={{ color: colors.text3 }} /></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* DESIGN STUDIO */}
            {view === 'design' && (
              <>
                <ViewHeader title="Design Studio" onBack={() => setView('home')} />
                {proofs.length === 0 ? <EmptyState icon={Palette} message="No design proofs yet. Your designer will upload proofs for review here." /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {proofs.map(p => (
                      <div key={p.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text1 }}>{p.project_title}</div>
                            <div style={{ fontSize: 12, color: colors.text3, fontFamily: "'JetBrains Mono', monospace" }}>Version {p.version}</div>
                          </div>
                          <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, background: p.status === 'approved' ? `${colors.green}20` : p.status === 'rejected' ? `${colors.red}20` : `${colors.amber}20`, color: p.status === 'approved' ? colors.green : p.status === 'rejected' ? colors.red : colors.amber }}>{p.status === 'pending' ? 'Awaiting Review' : p.status === 'approved' ? 'Approved' : 'Changes Requested'}</span>
                        </div>
                        <div style={{ background: colors.surface2, borderRadius: 10, padding: p.file_url ? 0 : 40, textAlign: 'center', marginBottom: 14, overflow: 'hidden' }}>
                          {p.file_url ? <img src={p.file_url} alt="Design proof" style={{ width: '100%', borderRadius: 10 }} /> : <><Eye size={32} style={{ color: colors.text3, margin: '0 auto 8px' }} /><div style={{ fontSize: 13, color: colors.text3 }}>Proof preview</div></>}
                        </div>
                        {p.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => handleApproveProof(p.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, background: colors.green, color: '#0d1a10', fontFamily: "'Barlow Condensed', sans-serif" }}><ThumbsUp size={16} /> Approve</button>
                            <button onClick={() => { setFeedbackId(p.id); setFeedbackText('') }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, border: `1px solid ${colors.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 800, background: 'transparent', color: colors.text2, fontFamily: "'Barlow Condensed', sans-serif" }}><MessageCircle size={16} /> Request Changes</button>
                          </div>
                        )}
                        {feedbackId === p.id && (
                          <div style={{ marginTop: 14, background: colors.surface2, borderRadius: 10, padding: 16 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>What changes are needed?</label>
                            <textarea style={{ width: '100%', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: colors.text1, outline: 'none', minHeight: 80, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Describe the changes you'd like..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} />
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                              <button onClick={submitProofFeedback} disabled={!feedbackText.trim()} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: feedbackText.trim() ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700, background: colors.accent, color: '#fff', opacity: feedbackText.trim() ? 1 : 0.5 }}>Submit Feedback</button>
                              <button onClick={() => setFeedbackId(null)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${colors.border}`, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'transparent', color: colors.text2 }}>Cancel</button>
                            </div>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: colors.text3, marginTop: 10 }}>{fmt(p.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* INVOICES */}
            {view === 'invoices' && (
              <>
                <ViewHeader title="Invoices" onBack={() => setView('home')} />
                {invoices.length === 0 ? <EmptyState icon={Receipt} message="No invoices yet. Your invoices will appear here." /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {invoices.map(inv => {
                      const isPaid = inv.status === 'paid'
                      const isOverdue = inv.status === 'overdue'
                      return (
                        <div key={inv.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 18 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text1 }}>INV-{String(inv.invoice_number).padStart(4, '0')}</div>
                              <div style={{ fontSize: 12, color: colors.text2 }}>{inv.title}</div>
                            </div>
                            <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, background: isPaid ? `${colors.green}20` : isOverdue ? `${colors.red}20` : `${colors.amber}20`, color: isPaid ? colors.green : isOverdue ? colors.red : colors.amber }}>{isPaid ? 'Paid' : isOverdue ? 'Overdue' : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 10, color: colors.text3, marginBottom: 2 }}>Total</div>
                              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: colors.text1 }}>{money(inv.total)}</div>
                            </div>
                            {!isPaid && inv.balance_due > 0 && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: colors.text3, marginBottom: 2 }}>Balance Due</div><div style={{ fontSize: 18, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: isOverdue ? colors.red : colors.amber }}>{money(inv.balance_due)}</div></div>}
                          </div>
                          {inv.due_date && <div style={{ fontSize: 11, color: colors.text3, marginTop: 8 }}>Due: {fmt(inv.due_date)}</div>}
                          {!isPaid && inv.balance_due > 0 && <button style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, background: colors.green, color: '#0d1a10', fontFamily: "'Barlow Condensed', sans-serif" }}><CreditCard size={16} /> Pay Now</button>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* REFERRALS */}
            {view === 'referrals' && (
              <>
                <ViewHeader title="Referrals" onBack={() => setView('home')} />
                <div style={{ background: `linear-gradient(135deg, ${colors.cyan}10, ${colors.accent}08)`, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 28, textAlign: 'center' }}>
                  <Gift size={40} style={{ color: colors.cyan, marginBottom: 16 }} />
                  <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>Refer a Friend, Earn Rewards</div>
                  <div style={{ fontSize: 14, color: colors.text2, marginBottom: 20, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 20px' }}>Share your unique referral link with friends and family. When they book a wrap, you both save!</div>
                  <div style={{ background: colors.surface2, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: colors.accent, fontWeight: 700 }}>usawrapco.com/ref/{displayName.toLowerCase().replace(/\s+/g, '')}</div>
                  </div>
                  <div style={{ fontSize: 12, color: colors.text3 }}>Contact us to activate your referral program</div>
                </div>
              </>
            )}

            {/* LOYALTY */}
            {view === 'loyalty' && (
              <>
                <ViewHeader title="Loyalty Rewards" onBack={() => setView('home')} />
                <div style={{ background: `linear-gradient(135deg, ${colors.amber}10, ${colors.purple}08)`, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 28, textAlign: 'center' }}>
                  <Star size={40} style={{ color: colors.amber, marginBottom: 16 }} />
                  <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>Loyalty Program</div>
                  <div style={{ fontSize: 14, color: colors.text2, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 20px' }}>Earn points with every project. Redeem for discounts on future wraps, maintenance, and accessories.</div>
                  <div style={{ background: colors.surface, borderRadius: 14, padding: 20, marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Your Tier</div>
                    <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: projects.length >= 3 ? colors.amber : colors.text2, marginBottom: 4 }}>{projects.length >= 3 ? 'Gold' : projects.length >= 1 ? 'Silver' : 'Bronze'}</div>
                    <div style={{ fontSize: 12, color: colors.text3, fontFamily: "'JetBrains Mono', monospace" }}>{projects.length} project{projects.length !== 1 ? 's' : ''} completed</div>
                  </div>
                  <div style={{ fontSize: 12, color: colors.text3 }}>Perks and rewards coming soon</div>
                </div>
              </>
            )}

            {/* MESSAGES */}
            {view === 'messages' && (
              <>
                <ViewHeader title="Messages" onBack={() => setView('home')} />
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input style={{ flex: 1, background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '12px 14px', fontSize: 14, color: colors.text1, outline: 'none', fontFamily: 'inherit' }} placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} />
                    <button onClick={sendMessage} disabled={!newMessage.trim()} style={{ padding: '12px 16px', borderRadius: 10, border: 'none', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', background: colors.accent, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, opacity: newMessage.trim() ? 1 : 0.5 }}><Send size={16} /></button>
                  </div>
                </div>
                {messages.length === 0 ? <EmptyState icon={MessageSquare} message="No messages yet. Send a message to your team above." /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {messages.map(m => (
                      <div key={m.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: m.sender_role === 'customer' ? colors.accent : colors.purple }}>{m.sender_name}</span>
                          <span style={{ fontSize: 10, color: colors.text3 }}>{fmt(m.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: colors.text2, lineHeight: 1.5 }}>{m.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom Mobile Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: colors.surface, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-around', padding: '8px 0', paddingBottom: 'max(8px, env(safe-area-inset-bottom))', zIndex: 50 }}>
        {([
          { key: 'home' as PortalView, label: 'Home', icon: Home },
          { key: 'jobs' as PortalView, label: 'Jobs', icon: FolderKanban },
          { key: 'design' as PortalView, label: 'Design', icon: Palette },
          { key: 'invoices' as PortalView, label: 'Invoices', icon: Receipt },
          { key: 'messages' as PortalView, label: 'Messages', icon: MessageSquare },
        ]).map(tab => {
          const active = view === tab.key || (tab.key === 'jobs' && view === 'job-detail')
          return (
            <button key={tab.key} onClick={() => setView(tab.key)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 12px', color: active ? colors.accent : colors.text3 }}>
              <tab.icon size={20} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {showNotifications && <div onClick={() => setShowNotifications(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 4px ${colors.accent}20 } 50% { box-shadow: 0 0 0 8px ${colors.accent}10 } }
      `}</style>
    </div>
  )
}

function ViewHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <button onClick={onBack} style={{ background: '#1a1d27', border: '1px solid #2a2f3d', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9299b5', flexShrink: 0 }}><ChevronLeft size={18} /></button>
      <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: '#e8eaed' }}>{title}</div>
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: typeof FolderKanban; message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#13151c', border: '1px solid #2a2f3d', borderRadius: 14 }}>
      <Icon size={36} style={{ color: '#5a6080', margin: '0 auto 14px' }} />
      <div style={{ fontSize: 14, color: '#9299b5', maxWidth: 340, margin: '0 auto' }}>{message}</div>
    </div>
  )
}
