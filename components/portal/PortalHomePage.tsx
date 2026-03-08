'use client'

import { usePortal } from '@/lib/portal-context'
import { C, STAGE_CONFIG, stageProgress, money, fmt } from '@/lib/portal-theme'
import Link from 'next/link'
import {
  FileText, CreditCard, MessageSquare, Calendar,
  ChevronRight, Activity, AlertCircle, Upload, Zap,
  Clock, Camera, Palette, Compass, Map, Wand2, Rocket,
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
  pendingProposals?: { id: string; title: string | null; status: string }[]
}

export default function PortalHomePage({ recentActivity, invoiceBalance, proofsPending, photoCounts, formDataMap, pendingProposals = [] }: Props) {
  const { customer, token, projects } = usePortal()
  const base = `/portal/${token}`

  // Build action items
  const actionItems: ActionItem[] = []

  for (const p of pendingProposals) {
    actionItems.push({
      id: `proposal-${p.id}`,
      icon: FileText,
      title: p.title || 'New Proposal Awaiting Review',
      description: 'Your sales rep sent a proposal — tap to view and select a package.',
      href: `${base}/proposals/${p.id}`,
      urgency: 'urgent',
    })
  }

  if (proofsPending > 0) {
    actionItems.push({
      id: 'proofs',
      icon: Zap,
      title: `${proofsPending} Design Proof${proofsPending > 1 ? 's' : ''} Need Approval`,
      description: 'Your designer is waiting before moving to production.',
      href: `${base}/design`,
      urgency: 'urgent',
    })
  }

  if (invoiceBalance > 0) {
    actionItems.push({
      id: 'invoice',
      icon: CreditCard,
      title: `Balance Due — ${money(invoiceBalance)}`,
      description: 'Tap to review and pay your invoice online.',
      href: `${base}/invoices`,
      urgency: 'urgent',
    })
  }

  const activeProjects = projects.filter(p => p.pipe_stage !== 'done')

  for (const p of activeProjects) {
    const count = photoCounts?.[p.id] || 0
    if (count < 3) {
      actionItems.push({
        id: `photos-${p.id}`,
        icon: Camera,
        title: 'Vehicle Photos Needed',
        description: count === 0
          ? 'Upload photos of your vehicle so we can start the design.'
          : `${count} photo${count !== 1 ? 's' : ''} uploaded — a few more angles would help.`,
        href: `${base}/upload?project=${p.id}`,
        urgency: count === 0 ? 'urgent' : 'pending',
      })
      break
    }
  }

  for (const p of activeProjects) {
    const fd = formDataMap?.[p.id]
    if (fd && !fd.measurements_submitted && (p.pipe_stage === 'sales_in' || p.pipe_stage === 'production')) {
      actionItems.push({
        id: `measurements-${p.id}`,
        icon: Upload,
        title: 'Send Vehicle Measurements',
        description: 'Accurate measurements help us design and quote correctly.',
        href: `${base}/upload?project=${p.id}`,
        urgency: 'pending',
      })
      break
    }
  }

  // Single active project — show inline timeline
  const singleActiveProject = activeProjects.length === 1 ? activeProjects[0] : null
  const singleProjectMilestones = singleActiveProject && formDataMap?.[singleActiveProject.id]
    ? buildMilestones(formDataMap[singleActiveProject.id], singleActiveProject.created_at)
    : null

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* ── ACTION ITEMS ──────────────────────────────────────────────────── */}
      {actionItems.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{
            fontSize: 11, fontWeight: 700, color: '#f25a5a', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: 1.5,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <AlertCircle size={13} />
            Action Required ({actionItems.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actionItems.map((item) => {
              const Icon = item.icon
              const color = item.urgency === 'urgent' ? '#f25a5a' : '#f59e0b'
              return (
                <Link key={item.id} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: `${color}10`, border: `1px solid ${color}30`,
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: `${color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={18} color={color} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{item.description}</div>
                    </div>
                    <ChevronRight size={16} color={C.text3} style={{ flexShrink: 0 }} />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── INLINE TIMELINE (single active job) ──────────────────────────── */}
      {singleActiveProject && singleProjectMilestones && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Job Progress — {singleActiveProject.title}
          </h2>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <PortalCustomerTimeline milestones={singleProjectMilestones} />
          </div>
        </section>
      )}

      {/* ── ACTIVE PROJECTS (multi-job view) ─────────────────────────────── */}
      {!singleActiveProject && activeProjects.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Active Jobs
            </h2>
            <Link href={`${base}/jobs`} style={{ fontSize: 11, color: C.accent, textDecoration: 'none', fontWeight: 600 }}>
              View All
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeProjects.slice(0, 4).map((p) => {
              const stage = STAGE_CONFIG[p.pipe_stage] || STAGE_CONFIG.sales_in
              const progress = stageProgress(p.pipe_stage)
              return (
                <Link key={p.id} href={`${base}/jobs/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{p.title}</div>
                        {p.vehicle_desc && <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{p.vehicle_desc}</div>}
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                        background: `${stage.color}18`, color: stage.color, flexShrink: 0,
                      }}>
                        {stage.label}
                      </div>
                    </div>
                    <div style={{ height: 3, background: C.surface2, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: stage.color, borderRadius: 2 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: C.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />{progress}% complete
                      </span>
                      {p.install_date && (
                        <span style={{ fontSize: 11, color: C.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={11} />Install: {fmt(p.install_date)}
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

      {/* ── QUICK LINKS ───────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Quick Links
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Messages',      icon: MessageSquare, href: `${base}/messages`,   color: C.cyan,   badge: 0 },
            { label: 'Design Proofs', icon: Palette,       href: `${base}/design`,     color: C.accent, badge: proofsPending },
            { label: 'My Jobs',       icon: FileText,      href: `${base}/jobs`,       color: C.green,  badge: 0 },
            { label: 'Invoices',      icon: CreditCard,    href: `${base}/invoices`,   color: C.amber,  badge: invoiceBalance > 0 ? 1 : 0 },
            { label: 'Financing',     icon: Rocket,        href: `${base}/financing`,  color: C.purple, badge: 0 },
          ].map((item) => (
            <Link key={item.label} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '16px 14px',
                display: 'flex', flexDirection: 'column', gap: 8, position: 'relative',
              }}>
                <item.icon size={20} color={item.color} strokeWidth={1.8} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                {item.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: 10, right: 10,
                    background: '#f25a5a', color: '#fff',
                    borderRadius: '50%', width: 18, height: 18,
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURED APPS ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Featured Apps
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* PNW Navigator */}
          <Link href={`${base}/explorer`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(79,127,255,0.08) 100%)',
              border: '1px solid rgba(34,211,238,0.25)',
              borderRadius: 14, padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(34,211,238,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Compass size={24} color={C.cyan} strokeWidth={1.6} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>PNW Navigator</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                  Explore boat ramps, marinas & scenic routes across the Pacific Northwest
                </div>
              </div>
              <ChevronRight size={18} color={C.text3} />
            </div>
          </Link>

          {/* Fleet Manager */}
          <Link href={`${base}/fleet`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(79,127,255,0.08) 100%)',
              border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: 14, padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(139,92,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Map size={24} color={C.purple} strokeWidth={1.6} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>Fleet Manager</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                  Track your wrapped vehicles, mileage, impressions & service schedules
                </div>
              </div>
              <ChevronRight size={18} color={C.text3} />
            </div>
          </Link>

          {/* Vehicle Mockup Generator */}
          <Link href={`/portal/quote/${token}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,192,122,0.12) 0%, rgba(79,127,255,0.08) 100%)',
              border: '1px solid rgba(34,192,122,0.25)',
              borderRadius: 14, padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(34,192,122,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Wand2 size={24} color={C.green} strokeWidth={1.6} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>Vehicle Mockup Generator</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
                  Design your wrap idea and get an instant estimate — takes 60 seconds
                </div>
              </div>
              <ChevronRight size={18} color={C.text3} />
            </div>
          </Link>

        </div>
      </section>

      {/* ── RECENT ACTIVITY ───────────────────────────────────────────────── */}
      {recentActivity.length > 0 && (
        <section>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Recent Activity
          </h2>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {recentActivity.slice(0, 6).map((a, i) => (
              <div key={a.id} style={{
                display: 'flex', gap: 12, padding: '12px 16px',
                borderBottom: i < Math.min(recentActivity.length, 6) - 1 ? `1px solid ${C.border}` : 'none',
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

      {/* ── EMPTY STATE ───────────────────────────────────────────────────── */}
      {projects.length === 0 && actionItems.length === 0 && recentActivity.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: C.text3 }}>
          <Wand2 size={36} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text2, marginBottom: 8 }}>All caught up!</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>No active projects yet. Ready to get started?</div>
          <Link href={`/portal/quote/${token}`} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'inline-block', padding: '12px 24px', borderRadius: 10,
              background: C.accent, color: '#fff', fontSize: 14, fontWeight: 600,
            }}>
              Build a Mockup &amp; Get a Quote
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
