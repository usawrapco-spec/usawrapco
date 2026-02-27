'use client'

import { usePortal } from '@/lib/portal-context'
import { C, STAGE_CONFIG, stageProgress, money, fmt } from '@/lib/portal-theme'
import Link from 'next/link'
import {
  FileText, CreditCard, MessageSquare, Calendar,
  ChevronRight, Activity,
} from 'lucide-react'

interface Props {
  recentActivity: { id: string; action: string; details: string | null; created_at: string }[]
  invoiceBalance: number
  proofsPending: number
}

export default function PortalHomePage({ recentActivity, invoiceBalance, proofsPending }: Props) {
  const { customer, token, projects } = usePortal()
  const base = `/portal/${token}`
  const firstName = customer.name?.split(' ')[0] || 'there'

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Active job cards */}
      {projects.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: C.text2, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Active Projects
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.filter(p => p.pipe_stage !== 'done').slice(0, 5).map((p) => {
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: C.text3 }}>{progress}% complete</span>
                      {p.install_date && (
                        <span style={{ fontSize: 11, color: C.text3 }}>Install: {fmt(p.install_date)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: C.text2, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'View Proposals', icon: FileText, href: `${base}/jobs`, color: C.accent },
            { label: 'Pay Invoice', icon: CreditCard, href: `${base}/invoices`, color: C.green, badge: invoiceBalance > 0 ? money(invoiceBalance) : undefined },
            { label: 'Message Us', icon: MessageSquare, href: `${base}/messages`, color: C.cyan },
            { label: 'Schedule', icon: Calendar, href: `${base}/schedule`, color: C.purple },
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
              }}>
                <action.icon size={22} color={action.color} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{action.label}</span>
                {action.badge && (
                  <span style={{ fontSize: 11, color: C.green, fontWeight: 600, fontFamily: 'var(--font-mono, JetBrains Mono, monospace)' }}>
                    {action.badge} due
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Pending proofs alert */}
      {proofsPending > 0 && (
        <Link href={`${base}/design`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: `${C.amber}12`,
            border: `1px solid ${C.amber}30`,
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.amber }}>
                {proofsPending} Design Proof{proofsPending > 1 ? 's' : ''} Awaiting Review
              </div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>Tap to view and approve</div>
            </div>
            <ChevronRight size={18} color={C.amber} />
          </div>
        </Link>
      )}

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: C.text2, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Recent Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentActivity.slice(0, 8).map((a, i) => (
              <div key={a.id} style={{
                display: 'flex',
                gap: 12,
                padding: '10px 0',
                borderBottom: i < recentActivity.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <Activity size={14} color={C.text3} style={{ marginTop: 3, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, color: C.text1 }}>{a.action}</div>
                  {a.details && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{a.details}</div>}
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{fmt(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: C.text3,
        }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>Welcome, {firstName}!</div>
          <div style={{ fontSize: 13 }}>No active projects yet. We will get you started soon.</div>
        </div>
      )}
    </div>
  )
}
