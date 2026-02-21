'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
interface PortalClientProps {
  userId: string
  userEmail: string
}

interface PortalProject {
  id: string
  title: string
  vehicle_desc: string | null
  pipe_stage: string
  status: string
  type: string
  created_at: string
  install_date: string | null
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
  bucket_path: string
  file_type: string
  created_at: string
  project_title?: string
}

interface PortalMessage {
  id: string
  content: string
  sender_name: string
  sender_role: 'customer' | 'staff'
  created_at: string
  project_title?: string
}

type PortalTab = 'projects' | 'proofs' | 'invoices' | 'files' | 'messages'

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
  install:     { bg: `${colors.cyan}20`,   text: colors.cyan,   label: 'Install' },
  prod_review: { bg: `${colors.amber}20`,  text: colors.amber,  label: 'QC Review' },
  sales_close: { bg: `${colors.amber}20`,  text: colors.amber,  label: 'Closing' },
  done:        { bg: `${colors.green}20`,  text: colors.green,  label: 'Completed' },
  estimate:    { bg: `${colors.text3}20`,  text: colors.text3,  label: 'Estimate' },
}

const PIPE_ORDER = ['sales_in', 'production', 'install', 'prod_review', 'sales_close', 'done']

// ─── Component ─────────────────────────────────────────────────────────────────
export default function PortalClient({ userId, userEmail }: PortalClientProps) {
  const [tab, setTab] = useState<PortalTab>('projects')
  const [projects, setProjects] = useState<PortalProject[]>([])
  const [proofs, setProofs] = useState<PortalProof[]>([])
  const [invoices, setInvoices] = useState<PortalInvoice[]>([])
  const [files, setFiles] = useState<PortalFile[]>([])
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load projects where user is customer
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, title, vehicle_desc, pipe_stage, status, type, created_at, install_date')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })

      if (projectData) setProjects(projectData)

      // Load invoices
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, invoice_number, title, total, balance_due, status, due_date')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })

      if (invoiceData) setInvoices(invoiceData)

      // Load design proofs
      const { data: proofData } = await supabase
        .from('design_proofs')
        .select('id, project_id, file_url, version, status, created_at, projects(title)')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })

      if (proofData) {
        setProofs(proofData.map((p: any) => ({
          ...p,
          project_title: p.projects?.title || 'Untitled Project',
        })))
      }

      // Load job images from customer's projects
      const projectIds = (projectData || []).map(p => p.id)
      if (projectIds.length > 0) {
        const { data: fileData } = await supabase
          .from('job_images')
          .select('id, file_name, bucket_path, file_type, created_at')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(50)

        if (fileData) setFiles(fileData)

        // Load job comments as messages
        const { data: commentData } = await supabase
          .from('job_comments')
          .select('id, body, author_name, created_at, project_id')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(50)

        if (commentData) {
          setMessages(commentData.map((c: any) => ({
            id: c.id,
            content: c.body,
            sender_name: c.author_name || 'USA Wrap Co',
            sender_role: 'staff' as const,
            created_at: c.created_at,
          })))
        }
      }
    } catch (err) {
      console.error('Portal load error:', err)
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleApproveProof = async (proofId: string) => {
    await supabase
      .from('design_proofs')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', proofId)
    setProofs(prev => prev.map(p => p.id === proofId ? { ...p, status: 'approved' } : p))
  }

  const handleRejectProof = (proofId: string) => {
    setFeedbackId(proofId)
    setFeedbackText('')
  }

  const submitProofFeedback = async () => {
    if (!feedbackId || !feedbackText.trim()) return
    await supabase
      .from('design_proofs')
      .update({ status: 'rejected', feedback: feedbackText })
      .eq('id', feedbackId)
    setProofs(prev => prev.map(p => p.id === feedbackId ? { ...p, status: 'rejected' } : p))
    setFeedbackId(null)
    setFeedbackText('')
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || projects.length === 0) return
    const projectId = projects[0].id
    await supabase.from('job_comments').insert({
      project_id: projectId,
      author_id: userId,
      author_name: userEmail.split('@')[0],
      body: newMessage,
      org_id: 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
    })
    setMessages(prev => [{
      id: Date.now().toString(),
      content: newMessage,
      sender_name: 'You',
      sender_role: 'customer',
      created_at: new Date().toISOString(),
    }, ...prev])
    setNewMessage('')
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  }

  const getProgress = (stage: string) => {
    const idx = PIPE_ORDER.indexOf(stage)
    if (idx < 0) return 0
    return ((idx + 1) / PIPE_ORDER.length) * 100
  }

  // ─── Tab Definitions ──────────────────────────────────────────────────────
  const tabs: { key: PortalTab; label: string; icon: typeof FolderKanban; count?: number }[] = [
    { key: 'projects', label: 'Projects', icon: FolderKanban, count: projects.length },
    { key: 'proofs', label: 'Proofs', icon: ImageIcon, count: proofs.filter(p => p.status === 'pending').length },
    { key: 'invoices', label: 'Invoices', icon: FileText, count: invoices.filter(i => i.status !== 'paid' && i.status !== 'void').length },
    { key: 'files', label: 'Files', icon: FolderOpen, count: files.length },
    { key: 'messages', label: 'Messages', icon: MessageSquare, count: messages.length },
  ]

  const hasMultipleVehicles = projects.length > 1

  // ─── Render ────────────────────────────────────────────────────────────────
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
          </div>
          <button
            onClick={handleSignOut}
            style={{
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
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
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
            My Account
          </div>
          <div style={{ fontSize: 13, color: colors.text2 }}>
            Welcome back! Track your projects, review proofs, and manage your account.
          </div>
        </div>

        {/* ─── Fleet Overview ────────────────────────────────────────────── */}
        {hasMultipleVehicles && (
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
              <Truck size={14} /> Fleet Overview
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {projects.map(p => {
                const sc = stageColors[p.pipe_stage] || stageColors.estimate
                return (
                  <div key={p.id} style={{
                    background: colors.surface2,
                    borderRadius: 10,
                    padding: '12px 16px',
                    minWidth: 180,
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text1, marginBottom: 4 }}>
                      {p.vehicle_desc || p.title}
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
        )}

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
                {(t.count || 0) > 0 && (
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

        {/* ─── Tab Content ───────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: colors.text3 }}>Loading...</div>
        ) : (
          <>
            {/* PROJECTS TAB */}
            {tab === 'projects' && (
              <div>
                {projects.length === 0 ? (
                  <EmptyState icon={FolderKanban} message="No projects yet. Your projects will appear here once created." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {projects.map(p => {
                      const sc = stageColors[p.pipe_stage] || stageColors.estimate
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
                              {p.vehicle_desc && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.text2 }}>
                                  <Car size={14} /> {p.vehicle_desc}
                                </div>
                              )}
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
                          {/* Progress bar */}
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
              </div>
            )}

            {/* PROOFS TAB */}
            {tab === 'proofs' && (
              <div>
                {proofs.length === 0 ? (
                  <EmptyState icon={ImageIcon} message="No design proofs yet. Once your designer uploads a proof, it will appear here for review." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {proofs.map(p => (
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
                            background: p.status === 'approved' ? `${colors.green}20` : p.status === 'rejected' ? `${colors.red}20` : `${colors.amber}20`,
                            color: p.status === 'approved' ? colors.green : p.status === 'rejected' ? colors.red : colors.amber,
                          }}>
                            {p.status === 'pending' ? 'Awaiting Review' : p.status === 'approved' ? 'Approved' : 'Changes Requested'}
                          </span>
                        </div>
                        {/* Proof preview area */}
                        <div style={{
                          background: colors.surface2,
                          borderRadius: 10,
                          padding: 40,
                          textAlign: 'center',
                          marginBottom: 14,
                        }}>
                          {p.file_url ? (
                            <img src={p.file_url} alt="Design proof" style={{ maxWidth: '100%', borderRadius: 8 }} />
                          ) : (
                            <>
                              <Eye size={32} style={{ color: colors.text3, margin: '0 auto 8px' }} />
                              <div style={{ fontSize: 13, color: colors.text3 }}>Proof preview</div>
                            </>
                          )}
                        </div>
                        {p.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              onClick={() => handleApproveProof(p.id)}
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
                              onClick={() => handleRejectProof(p.id)}
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
                        {/* Feedback inline */}
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
                                onClick={submitProofFeedback}
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
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INVOICES TAB */}
            {tab === 'invoices' && (
              <div>
                {invoices.length === 0 ? (
                  <EmptyState icon={FileText} message="No invoices yet. Your invoices will appear here." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {invoices.map(inv => {
                      const isPaid = inv.status === 'paid'
                      const isOverdue = inv.status === 'overdue'
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
                              background: isPaid ? `${colors.green}20` : isOverdue ? `${colors.red}20` : `${colors.amber}20`,
                              color: isPaid ? colors.green : isOverdue ? colors.red : colors.amber,
                            }}>
                              {isPaid ? 'Paid' : isOverdue ? 'Overdue' : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
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
                                  color: isOverdue ? colors.red : colors.amber,
                                }}>
                                  {formatCurrency(inv.balance_due)}
                                </div>
                              </div>
                            )}
                          </div>
                          {inv.due_date && (
                            <div style={{ fontSize: 11, color: colors.text3, marginTop: 8 }}>
                              Due: {formatDate(inv.due_date)}
                            </div>
                          )}
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
              </div>
            )}

            {/* FILES TAB */}
            {tab === 'files' && (
              <div>
                {files.length === 0 ? (
                  <EmptyState icon={FolderOpen} message="No files yet. Uploaded documents and deliverables will appear here." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {files.map(f => (
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
                            <FileText size={18} style={{ color: colors.text3 }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text1 }}>{f.file_name}</div>
                            <div style={{ fontSize: 11, color: colors.text3 }}>
                              {f.file_type} -- {formatDate(f.created_at)}
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
              </div>
            )}

            {/* MESSAGES TAB */}
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
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    />
                    <button
                      onClick={sendMessage}
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
                {messages.length === 0 ? (
                  <EmptyState icon={MessageSquare} message="No messages yet. Send a message to your team above." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {messages.map(m => {
                      const isCustomer = m.sender_role === 'customer'
                      return (
                        <div key={m.id} style={{
                          background: colors.surface,
                          border: `1px solid ${colors.border}`,
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
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, message }: { icon: typeof FolderKanban; message: string }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      background: '#13151c',
      border: '1px solid #2a2f3d',
      borderRadius: 14,
    }}>
      <Icon size={36} style={{ color: '#5a6080', margin: '0 auto 14px' }} />
      <div style={{ fontSize: 14, color: '#9299b5', maxWidth: 340, margin: '0 auto' }}>{message}</div>
    </div>
  )
}
