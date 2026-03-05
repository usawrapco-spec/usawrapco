'use client'

import { usePortal } from '@/lib/portal-context'
import { C, STAGE_CONFIG, stageProgress, money, fmt } from '@/lib/portal-theme'
import Link from 'next/link'
import {
  FileText, CreditCard, MessageSquare, Calendar,
  ChevronRight, Activity, AlertCircle, Upload, Zap,
  CheckCircle, Clock, Camera, Palette, Briefcase,
  ShoppingBag,
} from 'lucide-react'
import PortalCustomerTimeline from './PortalCustomerTimeline'
import { buildMilestones } from '@/components/projects/JobTimeline'

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
  photoCounts?: Record<string, number>
  formDataMap?: Record<string, Record<string, any>>
}

export default function PortalHomePage({ recentActivity, invoiceBalance, proofsPending, photoCounts, formDataMap }: Props) {
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

  // Check for missing photos on active projects
  const activeProjects = projects.filter(p => p.pipe_stage !== 'done')
  for (const p of activeProjects) {
    const count = photoCounts?.[p.id] || 0
    if (count < 3) {
      actionItems.push({
        id: `photos-${p.id}`,
        icon: Camera,
        title: 'Upload Vehicle Photos',
        description: count === 0
          ? 'We need photos of your vehicle to get started on your design.'
          : `Only ${count} photo${count !== 1 ? 's' : ''} uploaded — we need at least a few more angles.`,
        href: `${base}/upload?project=${p.id}`,
        urgency: count === 0 ? 'urgent' : 'pending',
      })
      break // Only show one photo to-do to keep it clean
    }
  }

  // Check for missing measurements
  for (const p of activeProjects) {
    const fd = formDataMap?.[p.id]
    if (fd && !fd.measurements_submitted && (p.pipe_stage === 'sales_in' || p.pipe_stage === 'production')) {
      actionItems.push({
        id: `measurements-${p.id}`,
        icon: Upload,
        title: 'Send Vehicle Measurements',
        description: 'Measurements help us create an accurate design. Use the upload tool to send them.',
        href: `${base}/upload?project=${p.id}`,
        urgency: 'pending',
      })
      break
    }
  }

  // Check for projects needing vehicle survey
  const salesInProjects = activeProjects.filter(p => p.pipe_stage === 'sales_in')
  const alreadyHasPhotoOrMeasurement = actionItems.some(a => a.id.startsWith('photos-') || a.id.startsWith('measurements-'))
  if (salesInProjects.length > 0 && !alreadyHasPhotoOrMeasurement) {
    actionItems.push({
      id: 'intake',
      icon: Upload,
      title: 'Complete Your Vehicle Survey',
      description: 'We need vehicle information and your logo files to get started.',
      href: `${base}/upload`,
      urgency: 'pending',
    })
  }

  // Build timeline data for single-project inline view
  const singleActiveProject = activeProjects.length === 1 ? activeProjects[0] : null
  const singleProjectFormData = singleActiveProject && formDataMap?.[singleActiveProject.id]
  const singleProjectMilestones = singleProjectFormData
    ? buildMilestones(singleProjectFormData, singleActiveProject.created_at)
    : null

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* ── ACTION REQUIRED / TO-DO LIST ────────────────────────────────────── */}
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
            Your To-Do List ({actionItems.length})
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

      {/* ── INLINE TIMELINE (single active project) ─────────────────────────── */}
      {singleActiveProject && singleProjectMilestones && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Job Progress — {singleActiveProject.title}
          </h2>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 16,
          }}>
            <PortalCustomerTimeline milestones={singleProjectMilestones} />
          </div>
        </section>
      )}

      {/* ── ACTIVE PROJECTS (multi-project view) ───────────────────────────── */}
      {!singleActiveProject && activeProjects.length > 0 && (
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
            {
              label: 'Review Proofs',
              icon: Palette,
              href: `${base}/design`,
              color: C.accent,
              badge: proofsPending > 0 ? `${proofsPending} pending` : undefined,
            },
            { label: 'Upload Photos', icon: Camera, href: `${base}/upload`, color: C.green },
            { label: 'Message Team', icon: MessageSquare, href: `${base}/messages`, color: '#22d3ee' },
            { label: 'View Jobs', icon: Briefcase, href: `${base}/jobs`, color: '#8b5cf6' },
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
                  <span style={{ fontSize: 11, color: action.color, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                    {action.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── PRODUCT CATALOG PREVIEW ────────────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Products & Services
          </h2>
          <Link href={`${base}/catalog`} style={{ fontSize: 11, color: C.accent, textDecoration: 'none', fontWeight: 600 }}>
            View All
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { label: 'Vehicle Wraps', desc: 'Full, partial & commercial wraps', color: C.accent },
            { label: 'Signs & Banners', desc: 'Indoor & outdoor signage', color: C.green },
            { label: 'Wall Graphics', desc: 'Murals, decals & wallpaper', color: '#8b5cf6' },
            { label: 'Window Tint', desc: 'Automotive & architectural', color: '#22d3ee' },
          ].map((cat) => (
            <Link
              key={cat.label}
              href={`${base}/catalog`}
              style={{ textDecoration: 'none', color: 'inherit', minWidth: 160, flexShrink: 0 }}
            >
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 14,
                height: '100%',
              }}>
                <ShoppingBag size={18} color={cat.color} strokeWidth={1.8} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{cat.label}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{cat.desc}</div>
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
