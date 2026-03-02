'use client'

import { usePortal } from '@/lib/portal-context'
import { C, STAGE_CONFIG, stageProgress, money, fmt } from '@/lib/portal-theme'
import Link from 'next/link'
import {
  FileText, CreditCard, MessageSquare, Calendar,
  ChevronRight, Activity, AlertCircle, Upload, Zap,
  CheckCircle, Clock,
} from 'lucide-react'

interface ActionItem {
  id: string
  icon: typeof AlertCircle
  title: string
  description: string
  href: string
  urgency: 'urgent' | 'pending'
}

interface Props {
  recentActivity: { id: string; action: string; details: string | null; created_at: string }[]
  invoiceBalance: number
  proofsPending: number
}

export default function PortalHomePage({ recentActivity, invoiceBalance, proofsPending }: Props) {
  const { customer, token, projects } = usePortal()
  const base = `/portal/${token}`

  // Build action items from data
  const actionItems: ActionItem[] = []

  if (proofsPending > 0) {
    actionItems.push({
      id: 'proofs',
      icon: Zap,
      title: `${proofsPending} Design Proof${proofsPending > 1 ? 's' : ''} Awaiting Approval`,
      description: 'Your designer is waiting for your feedback before production.',
      href: `${base}/design`,
      urgency: 'urgent',
    })
  }

  if (invoiceBalance > 0) {
    actionItems.push({
      id: 'invoice',
      icon: CreditCard,
      title: `Invoice Due — ${money(invoiceBalance)}`,
      description: 'Tap to review your invoice and pay online.',
      href: `${base}/invoices`,
      urgency: 'urgent',
    })
  }

  // Check projects for stages that need customer input
  const salesInProjects = projects.filter(p => p.pipe_stage === 'sales_in')
  if (salesInProjects.length > 0) {
    actionItems.push({
      id: 'intake',
      icon: Upload,
      title: 'Complete Your Vehicle Survey',
      description: 'We need vehicle information and your logo files to get started.',
      href: `${base}/jobs`,
      urgency: 'pending',
    })
  }

  const activeProjects = projects.filter(p => p.pipe_stage !== 'done')

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* ── ACTION REQUIRED SECTION ─────────────────────────────────────── */}
      {actionItems.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#f25a5a',
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <AlertCircle size={13} />
            Action Required
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actionItems.map((item) => {
              const Icon = item.icon
              const isUrgent = item.urgency === 'urgent'
              const color = isUrgent ? '#f25a5a' : '#f59e0b'
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{
                    background: `${color}10`,
                    border: `1px solid ${color}35`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `${color}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={20} color={color} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{item.description}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 5,
                        background: `${color}20`,
                        color: color,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>
                        {isUrgent ? 'Urgent' : 'Pending'}
                      </span>
                      <ChevronRight size={16} color={C.text3} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── ACTIVE PROJECTS ────────────────────────────────────────────────── */}
      {activeProjects.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Active Projects
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeProjects.slice(0, 5).map((p) => {
              const stage = STAGE_CONFIG[p.pipe_stage] || STAGE_CONFIG.sales_in
              const progress = stageProgress(p.pipe_stage)
              return (
                <Link
                  key={p.id}
                  href={`${base}/jobs/${p.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 16,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{p.title}</div>
                        {p.vehicle_desc && (
                          <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{p.vehicle_desc}</div>
                        )}
                      </div>
                      <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: `${stage.color}18`,
                        color: stage.color,
                        flexShrink: 0,
                      }}>
                        {stage.label}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, background: C.surface2, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: stage.color,
                        borderRadius: 2,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: C.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        {progress}% complete
                      </span>
                      {p.install_date && (
                        <span style={{ fontSize: 11, color: C.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={11} />
                          Install: {fmt(p.install_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── QUICK ACTIONS ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'View Jobs', icon: FileText, href: `${base}/jobs`, color: C.accent },
            {
              label: 'Pay Invoice',
              icon: CreditCard,
              href: `${base}/invoices`,
              color: C.green,
              badge: invoiceBalance > 0 ? money(invoiceBalance) : undefined,
            },
            { label: 'Message Team', icon: MessageSquare, href: `${base}/messages`, color: '#22d3ee' },
            { label: 'Schedule', icon: Calendar, href: `${base}/schedule`, color: '#8b5cf6' },
          ].map((action) => (
            <Link key={action.label} href={action.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minHeight: 80,
              }}>
                <action.icon size={22} color={action.color} strokeWidth={1.8} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{action.label}</span>
                {action.badge && (
                  <span style={{ fontSize: 11, color: C.green, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                    {action.badge} due
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── RECENT ACTIVITY ────────────────────────────────────────────────── */}
      {recentActivity.length > 0 && (
        <section>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Recent Activity
          </h2>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {recentActivity.slice(0, 8).map((a, i) => (
              <div key={a.id} style={{
                display: 'flex',
                gap: 12,
                padding: '12px 16px',
                borderBottom: i < Math.min(recentActivity.length, 8) - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <Activity size={14} color={C.accent} style={{ marginTop: 3, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text1 }}>{a.action}</div>
                  {a.details && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{a.details}</div>}
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{fmt(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── EMPTY STATE ────────────────────────────────────────────────────── */}
      {projects.length === 0 && actionItems.length === 0 && recentActivity.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: C.text3,
        }}>
          <CheckCircle size={36} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text2, marginBottom: 8 }}>
            You are all caught up!
          </div>
          <div style={{ fontSize: 13 }}>No active projects yet. We will get you started soon.</div>
        </div>
      )}
    </div>
  )
}
