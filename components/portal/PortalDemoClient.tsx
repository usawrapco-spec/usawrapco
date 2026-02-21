'use client'

import { useState } from 'react'
import {
  FolderKanban,
  Image as ImageIcon,
  FileText,
  FolderOpen,
  MessageSquare,
  LogOut,
  Car,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Download,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  CreditCard,
  ChevronRight,
  Truck,
  Eye,
  User,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type PortalTab = 'projects' | 'proofs' | 'invoices' | 'files' | 'messages'

interface DemoProject {
  id: string
  title: string
  vehicle_desc: string
  pipe_stage: string
  type: string
  created_at: string
  install_date: string | null
}

interface DemoProof {
  id: string
  project_title: string
  version: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  note: string
}

interface DemoInvoice {
  id: string
  invoice_number: number
  title: string
  total: number
  balance_due: number
  status: string
  due_date: string
}

interface DemoFile {
  id: string
  file_name: string
  file_type: string
  size: string
  created_at: string
  project: string
}

interface DemoMessage {
  id: string
  content: string
  sender_name: string
  sender_role: 'customer' | 'staff'
  created_at: string
}

// ─── Demo Data ─────────────────────────────────────────────────────────────────
const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'p1',
    title: 'Ford F-150 Fleet Wrap',
    vehicle_desc: '2024 Ford F-150 XLT -- White',
    pipe_stage: 'production',
    type: 'wrap',
    created_at: '2026-02-10T10:00:00Z',
    install_date: '2026-03-05T09:00:00Z',
  },
  {
    id: 'p2',
    title: 'Tesla Model 3 Color Change',
    vehicle_desc: '2025 Tesla Model 3 -- Midnight Silver',
    pipe_stage: 'install',
    type: 'wrap',
    created_at: '2026-01-28T14:00:00Z',
    install_date: '2026-02-25T08:00:00Z',
  },
  {
    id: 'p3',
    title: 'RAM 2500 Full Wrap',
    vehicle_desc: '2023 RAM 2500 Tradesman -- White',
    pipe_stage: 'done',
    type: 'wrap',
    created_at: '2025-12-15T09:00:00Z',
    install_date: null,
  },
]

const DEMO_PROOFS: DemoProof[] = [
  {
    id: 'pr1',
    project_title: 'Ford F-150 Fleet Wrap',
    version: 2,
    status: 'pending',
    created_at: '2026-02-19T16:30:00Z',
    note: 'Updated logo placement per your feedback. Phone number moved to tailgate.',
  },
  {
    id: 'pr2',
    project_title: 'Tesla Model 3 Color Change',
    version: 1,
    status: 'pending',
    created_at: '2026-02-17T11:00:00Z',
    note: 'Satin Nardo Grey color sample render. Full body coverage including mirrors.',
  },
  {
    id: 'pr3',
    project_title: 'RAM 2500 Full Wrap',
    version: 3,
    status: 'approved',
    created_at: '2026-01-08T14:00:00Z',
    note: 'Final approved design with all revisions incorporated.',
  },
]

const DEMO_INVOICES: DemoInvoice[] = [
  {
    id: 'inv1',
    invoice_number: 3045,
    title: 'Ford F-150 Fleet Wrap -- 50% Deposit',
    total: 1850.00,
    balance_due: 1850.00,
    status: 'sent',
    due_date: '2026-02-28',
  },
  {
    id: 'inv2',
    invoice_number: 3032,
    title: 'RAM 2500 Full Wrap -- Final Balance',
    total: 3700.00,
    balance_due: 0,
    status: 'paid',
    due_date: '2026-01-20',
  },
]

const DEMO_FILES: DemoFile[] = [
  { id: 'f1', file_name: 'F150_proof_v2_front.png', file_type: 'proof', size: '2.4 MB', created_at: '2026-02-19T16:30:00Z', project: 'Ford F-150' },
  { id: 'f2', file_name: 'F150_proof_v2_driver.png', file_type: 'proof', size: '2.1 MB', created_at: '2026-02-19T16:30:00Z', project: 'Ford F-150' },
  { id: 'f3', file_name: 'Model3_satin_grey_render.png', file_type: 'proof', size: '3.8 MB', created_at: '2026-02-17T11:00:00Z', project: 'Tesla Model 3' },
  { id: 'f4', file_name: 'RAM2500_final_approved.pdf', file_type: 'pdf', size: '5.2 MB', created_at: '2026-01-08T14:00:00Z', project: 'RAM 2500' },
  { id: 'f5', file_name: 'RAM2500_install_photos.zip', file_type: 'export', size: '18.6 MB', created_at: '2026-01-15T17:00:00Z', project: 'RAM 2500' },
  { id: 'f6', file_name: 'company_logo_vector.ai', file_type: 'reference', size: '1.1 MB', created_at: '2026-02-10T10:00:00Z', project: 'Ford F-150' },
]

const DEMO_MESSAGES: DemoMessage[] = [
  { id: 'm1', content: 'Hey Mike! Just uploaded the updated F-150 proof with the logo repositioned. Take a look when you get a chance.', sender_name: 'Sarah (Designer)', sender_role: 'staff', created_at: '2026-02-19T16:35:00Z' },
  { id: 'm2', content: 'Thanks Sarah! Looking at it now. The front looks great.', sender_name: 'You', sender_role: 'customer', created_at: '2026-02-19T17:10:00Z' },
  { id: 'm3', content: 'Your Tesla is scheduled for install on Feb 25th at 8am. Please drop it off the night before if possible. Plan on about 3 days for the color change.', sender_name: 'James (Sales)', sender_role: 'staff', created_at: '2026-02-18T09:00:00Z' },
  { id: 'm4', content: 'Sounds good, I can drop it off the evening of the 24th. Is there anything I should do to prep the car?', sender_name: 'You', sender_role: 'customer', created_at: '2026-02-18T10:30:00Z' },
  { id: 'm5', content: 'Just make sure it is clean and free of wax/ceramic coating on the areas being wrapped. A simple hand wash is perfect. No wax.', sender_name: 'James (Sales)', sender_role: 'staff', created_at: '2026-02-18T10:45:00Z' },
  { id: 'm6', content: 'Your RAM 2500 wrap is all done! Came out amazing. Swing by to pick it up anytime. We will send the final install photos shortly.', sender_name: 'James (Sales)', sender_role: 'staff', created_at: '2026-01-15T16:00:00Z' },
  { id: 'm7', content: 'Wow, it looks incredible! Will be there tomorrow morning. Thanks to the whole team!', sender_name: 'You', sender_role: 'customer', created_at: '2026-01-15T18:00:00Z' },
]

// ─── Styles ────────────────────────────────────────────────────────────────────
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
  prod_review: { bg: `${colors.amber}20`,  text: colors.amber,  label: 'QC Review' },
  sales_close: { bg: `${colors.amber}20`,  text: colors.amber,  label: 'Closing' },
  done:        { bg: `${colors.green}20`,  text: colors.green,  label: 'Completed' },
}

const PIPE_ORDER = ['sales_in', 'production', 'install', 'prod_review', 'sales_close', 'done']

// ─── Component ─────────────────────────────────────────────────────────────────
export default function PortalDemoClient() {
  const [tab, setTab] = useState<PortalTab>('projects')
  const [proofStatuses, setProofStatuses] = useState<Record<string, string>>({})
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [extraMessages, setExtraMessages] = useState<DemoMessage[]>([])

  const allMessages = [...extraMessages, ...DEMO_MESSAGES]

  const getProofStatus = (p: DemoProof) => proofStatuses[p.id] || p.status

  const handleApprove = (id: string) => {
    setProofStatuses(prev => ({ ...prev, [id]: 'approved' }))
  }

  const handleRequestChanges = (id: string) => {
    setFeedbackId(id)
    setFeedbackText('')
  }

  const submitFeedback = () => {
    if (!feedbackId) return
    setProofStatuses(prev => ({ ...prev, [feedbackId]: 'rejected' }))
    setFeedbackId(null)
    setFeedbackText('')
  }

  const sendDemoMessage = () => {
    if (!newMessage.trim()) return
    setExtraMessages(prev => [{
      id: `dm-${Date.now()}`,
      content: newMessage,
      sender_name: 'You',
      sender_role: 'customer',
      created_at: new Date().toISOString(),
    }, ...prev])
    setNewMessage('')
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const getProgress = (stage: string) => {
    const idx = PIPE_ORDER.indexOf(stage)
    if (idx < 0) return 0
    return ((idx + 1) / PIPE_ORDER.length) * 100
  }

  const pendingProofs = DEMO_PROOFS.filter(p => getProofStatus(p) === 'pending').length
  const unpaidInvoices = DEMO_INVOICES.filter(i => i.status !== 'paid').length

  const tabs: { key: PortalTab; label: string; icon: typeof FolderKanban; count: number }[] = [
    { key: 'projects', label: 'Projects', icon: FolderKanban, count: DEMO_PROJECTS.length },
    { key: 'proofs', label: 'Proofs', icon: ImageIcon, count: pendingProofs },
    { key: 'invoices', label: 'Invoices', icon: FileText, count: unpaidInvoices },
    { key: 'files', label: 'Files', icon: FolderOpen, count: DEMO_FILES.length },
    { key: 'messages', label: 'Messages', icon: MessageSquare, count: allMessages.length },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      color: colors.text1,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* ─── Top Nav ────────────────────────────────────────────────────── */}
      <div style={{
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          fontSize: 22,
          fontWeight: 900,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '-0.01em',
          color: colors.text1,
        }}>
          USA WRAP CO
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: `${colors.accent}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <User size={16} style={{ color: colors.accent }} />
            </div>
            <span style={{ fontSize: 13, color: colors.text2 }}>Mike Johnson</span>
          </div>
          <button style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: '8px 14px',
            color: colors.text2,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {/* ─── Demo Banner ───────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 18px',
          background: `${colors.purple}10`,
          border: `1px solid ${colors.purple}30`,
          borderRadius: 12,
          marginBottom: 24,
          fontSize: 13,
          color: colors.purple,
        }}>
          <Eye size={16} />
          <span><strong>Demo Mode</strong> -- This portal is populated with sample data. In production, customers see their real projects.</span>
        </div>

        {/* ─── Welcome Banner ────────────────────────────────────────────── */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 900,
            fontFamily: "'Barlow Condensed', sans-serif",
            marginBottom: 4,
          }}>
            Welcome back, Mike
          </div>
          <div style={{ fontSize: 13, color: colors.text2 }}>
            You have {pendingProofs} proof{pendingProofs !== 1 ? 's' : ''} awaiting review and {unpaidInvoices} outstanding invoice{unpaidInvoices !== 1 ? 's' : ''}.
          </div>
        </div>

        {/* ─── Fleet Overview ────────────────────────────────────────────── */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 20,
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: colors.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Truck size={14} /> Fleet Overview -- 3 Vehicles
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {DEMO_PROJECTS.map(p => {
              const sc = stageColors[p.pipe_stage]
              return (
                <div key={p.id} style={{
                  background: colors.surface2,
                  borderRadius: 10,
                  padding: '12px 16px',
                  minWidth: 200,
                  flexShrink: 0,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text1, marginBottom: 6 }}>
                    {p.vehicle_desc.split(' -- ')[0]}
                  </div>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 800,
                    background: sc.bg,
                    color: sc.text,
                  }}>
                    {sc.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Tabs ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 2,
        }}>
          {tabs.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 18px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  background: active ? `${colors.accent}15` : 'transparent',
                  color: active ? colors.accent : colors.text2,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  outline: 'none',
                }}
              >
                <t.icon size={16} />
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    background: active ? colors.accent : colors.surface2,
                    color: active ? '#fff' : colors.text3,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ─── PROJECTS TAB ──────────────────────────────────────────────── */}
        {tab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DEMO_PROJECTS.map(p => {
              const sc = stageColors[p.pipe_stage]
              const progress = getProgress(p.pipe_stage)
              return (
                <div key={p.id} style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: colors.text1, marginBottom: 4 }}>{p.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.text2 }}>
                        <Car size={14} /> {p.vehicle_desc}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      background: sc.bg,
                      color: sc.text,
                    }}>
                      {sc.label}
                    </span>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: colors.text3 }}>Progress</span>
                      <span style={{ fontSize: 11, color: colors.text3, fontFamily: "'JetBrains Mono', monospace" }}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: 6,
                      background: colors.surface2,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: progress === 100 ? colors.green : colors.accent,
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: colors.text3 }}>
                      Created {formatDate(p.created_at)}
                    </span>
                    {p.install_date && (
                      <span style={{ fontSize: 11, color: colors.amber, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> Install: {formatDate(p.install_date)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── PROOFS TAB ────────────────────────────────────────────────── */}
        {tab === 'proofs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DEMO_PROOFS.map(p => {
              const status = getProofStatus(p)
              return (
                <div key={p.id} style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text1 }}>{p.project_title}</div>
                      <div style={{ fontSize: 12, color: colors.text3, fontFamily: "'JetBrains Mono', monospace" }}>
                        Version {p.version}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      background: status === 'approved' ? `${colors.green}20` : status === 'rejected' ? `${colors.red}20` : `${colors.amber}20`,
                      color: status === 'approved' ? colors.green : status === 'rejected' ? colors.red : colors.amber,
                    }}>
                      {status === 'pending' ? 'Awaiting Review' : status === 'approved' ? 'Approved' : 'Changes Requested'}
                    </span>
                  </div>
                  {/* Proof preview placeholder */}
                  <div style={{
                    background: colors.surface2,
                    borderRadius: 10,
                    padding: '36px 20px',
                    textAlign: 'center',
                    marginBottom: 14,
                    border: `1px solid ${colors.border}`,
                  }}>
                    <Eye size={32} style={{ color: colors.text3, margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 13, color: colors.text3 }}>Design proof preview</div>
                  </div>
                  <div style={{ fontSize: 13, color: colors.text2, marginBottom: 14, lineHeight: 1.5 }}>
                    {p.note}
                  </div>
                  {status === 'pending' && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => handleApprove(p.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 800,
                          background: colors.green,
                          color: '#0d1a10',
                          fontFamily: "'Barlow Condensed', sans-serif",
                        }}
                      >
                        <ThumbsUp size={16} /> Approve
                      </button>
                      <button
                        onClick={() => handleRequestChanges(p.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: `1px solid ${colors.border}`,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 800,
                          background: 'transparent',
                          color: colors.text2,
                          fontFamily: "'Barlow Condensed', sans-serif",
                        }}
                      >
                        <MessageCircle size={16} /> Request Changes
                      </button>
                    </div>
                  )}
                  {status === 'approved' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      borderRadius: 10,
                      background: `${colors.green}10`,
                      border: `1px solid ${colors.green}30`,
                      fontSize: 13,
                      color: colors.green,
                      fontWeight: 700,
                    }}>
                      <CheckCircle2 size={16} /> Design approved
                    </div>
                  )}
                  {status === 'rejected' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      borderRadius: 10,
                      background: `${colors.amber}10`,
                      border: `1px solid ${colors.amber}30`,
                      fontSize: 13,
                      color: colors.amber,
                      fontWeight: 700,
                    }}>
                      <AlertCircle size={16} /> Changes requested -- designer notified
                    </div>
                  )}
                  {/* Feedback form */}
                  {feedbackId === p.id && (
                    <div style={{
                      marginTop: 14,
                      background: colors.surface2,
                      borderRadius: 10,
                      padding: 16,
                    }}>
                      <label style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 800,
                        color: colors.text3,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 8,
                      }}>
                        What changes are needed?
                      </label>
                      <textarea
                        style={{
                          width: '100%',
                          background: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 8,
                          padding: '10px 12px',
                          fontSize: 13,
                          color: colors.text1,
                          outline: 'none',
                          minHeight: 80,
                          resize: 'vertical',
                          fontFamily: 'inherit',
                        }}
                        placeholder="Describe the changes you'd like..."
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          onClick={submitFeedback}
                          disabled={!feedbackText.trim()}
                          style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: feedbackText.trim() ? 'pointer' : 'not-allowed',
                            fontSize: 12,
                            fontWeight: 700,
                            background: colors.accent,
                            color: '#fff',
                            opacity: feedbackText.trim() ? 1 : 0.5,
                          }}
                        >
                          Submit Feedback
                        </button>
                        <button
                          onClick={() => setFeedbackId(null)}
                          style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: `1px solid ${colors.border}`,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                            background: 'transparent',
                            color: colors.text2,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: colors.text3, marginTop: 10 }}>
                    {formatDate(p.created_at)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── INVOICES TAB ──────────────────────────────────────────────── */}
        {tab === 'invoices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DEMO_INVOICES.map(inv => {
              const isPaid = inv.status === 'paid'
              return (
                <div key={inv.id} style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text1 }}>
                        INV-{String(inv.invoice_number).padStart(4, '0')}
                      </div>
                      <div style={{ fontSize: 12, color: colors.text2 }}>{inv.title}</div>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      background: isPaid ? `${colors.green}20` : `${colors.amber}20`,
                      color: isPaid ? colors.green : colors.amber,
                    }}>
                      {isPaid ? 'Paid' : 'Outstanding'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 11, color: colors.text3, marginBottom: 2 }}>Total</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 900,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: colors.text1,
                      }}>
                        {formatCurrency(inv.total)}
                      </div>
                    </div>
                    {!isPaid && inv.balance_due > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: colors.text3, marginBottom: 2 }}>Balance Due</div>
                        <div style={{
                          fontSize: 18,
                          fontWeight: 900,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: colors.amber,
                        }}>
                          {formatCurrency(inv.balance_due)}
                        </div>
                      </div>
                    )}
                    {isPaid && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.green }}>
                        <CheckCircle2 size={18} />
                        <span style={{ fontSize: 13, fontWeight: 700 }}>Paid in full</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: colors.text3, marginTop: 8 }}>
                    Due: {formatDate(inv.due_date)}
                  </div>
                  {!isPaid && inv.balance_due > 0 && (
                    <button style={{
                      marginTop: 14,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 800,
                      background: colors.green,
                      color: '#0d1a10',
                      fontFamily: "'Barlow Condensed', sans-serif",
                    }}>
                      <CreditCard size={16} /> Pay Now
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── FILES TAB ─────────────────────────────────────────────────── */}
        {tab === 'files' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_FILES.map(f => (
              <div key={f.id} style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: colors.surface2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {f.file_type === 'proof' ? (
                      <ImageIcon size={18} style={{ color: colors.purple }} />
                    ) : f.file_type === 'pdf' ? (
                      <FileText size={18} style={{ color: colors.red }} />
                    ) : (
                      <FolderOpen size={18} style={{ color: colors.text3 }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text1 }}>{f.file_name}</div>
                    <div style={{ fontSize: 11, color: colors.text3 }}>
                      {f.project} -- {f.size} -- {formatDate(f.created_at)}
                    </div>
                  </div>
                </div>
                <button style={{
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: colors.text2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  <Download size={14} /> Download
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ─── MESSAGES TAB ──────────────────────────────────────────────── */}
        {tab === 'messages' && (
          <div>
            {/* Compose */}
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  style={{
                    flex: 1,
                    background: colors.surface2,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 14,
                    color: colors.text1,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDemoMessage() } }}
                />
                <button
                  onClick={sendDemoMessage}
                  disabled={!newMessage.trim()}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                    background: colors.accent,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: newMessage.trim() ? 1 : 0.5,
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allMessages.map(m => {
                const isCustomer = m.sender_role === 'customer'
                return (
                  <div key={m.id} style={{
                    background: colors.surface,
                    border: `1px solid ${isCustomer ? `${colors.accent}30` : colors.border}`,
                    borderRadius: 12,
                    padding: '14px 18px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: isCustomer ? colors.accent : colors.purple,
                      }}>
                        {m.sender_name}
                      </span>
                      <span style={{ fontSize: 10, color: colors.text3 }}>
                        {formatDate(m.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: colors.text2, lineHeight: 1.5 }}>
                      {m.content}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 900,
        margin: '40px auto 0',
        padding: '20px 16px 40px',
        borderTop: `1px solid ${colors.border}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, color: colors.text3 }}>
          Powered by USA Wrap Co CRM -- Questions? Contact your sales representative.
        </div>
      </div>
    </div>
  )
}
