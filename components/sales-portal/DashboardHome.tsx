'use client'

import Link from 'next/link'
import {
  Phone, Users, Briefcase, ListChecks, Brain, Clock,
  ChevronRight, Plus, PhoneCall, Timer, ArrowRight,
  CheckCircle2, AlertCircle,
} from 'lucide-react'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', purple: '#8b5cf6', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

interface Props {
  profile: { id: string; name: string; org_id: string; role: string; xp: number; level: number }
  stats: {
    callsToday: number
    totalTalkTime: number
    activeReferrals: number
    pendingTasks: number
    completedTasks: number
    unreviewed: number
    leadsRemaining: number
  }
  lists: { id: string; name: string; total_count: number; called_count: number; status: string }[]
  referrals: { id: string; customer_name: string | null; vehicle_desc: string | null; status: string; commission_amount: number | null; service_type: string; created_at: string }[]
  tasks: { id: string; title: string; type: string; priority: string; status: string; description: string | null }[]
  callbackLeads: { id: string; name: string; company: string | null; phone: string | null; next_callback: string | null }[]
  analyses: { id: string; score: number | null; summary: string | null; coaching_feedback: string | null }[]
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  submitted:   { label: 'Submitted',     color: C.text2 },
  estimate:    { label: 'Estimating',    color: C.accent },
  approved:    { label: 'Approved',      color: C.cyan },
  deposit:     { label: 'Deposit In',    color: C.cyan },
  production:  { label: 'In Production', color: C.purple },
  install:     { label: 'Installing',    color: C.purple },
  complete:    { label: 'Complete',      color: C.green },
  paid:        { label: 'Paid',          color: C.green },
  cancelled:   { label: 'Cancelled',     color: C.red },
}

const TASK_TYPE_ICON: Record<string, { Icon: typeof Phone; color: string }> = {
  review_call_feedback: { Icon: Brain, color: C.purple },
  follow_up:            { Icon: PhoneCall, color: C.accent },
  callback:             { Icon: Phone, color: C.green },
  check_job:            { Icon: Briefcase, color: C.cyan },
  send_quote:           { Icon: Briefcase, color: C.amber },
  send_text:            { Icon: Phone, color: C.green },
  send_email:           { Icon: Phone, color: C.accent },
  custom:               { Icon: ListChecks, color: C.text2 },
}

export default function DashboardHome({ profile, stats, lists, referrals, tasks, callbackLeads, analyses }: Props) {
  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const activeReferrals = referrals.filter(r => !['complete', 'paid', 'cancelled'].includes(r.status))

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Calls', value: stats.callsToday.toString(), icon: Phone, color: C.accent },
          { label: 'Talk Time', value: formatDuration(stats.totalTalkTime), icon: Timer, color: C.green },
          { label: 'Leads Left', value: stats.leadsRemaining.toString(), icon: Users, color: C.cyan },
          { label: 'Active Jobs', value: stats.activeReferrals.toString(), icon: Briefcase, color: C.amber },
        ].map(s => (
          <div key={s.label} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '12px 8px', textAlign: 'center',
          }}>
            <s.icon size={16} color={s.color} strokeWidth={1.6} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 9, color: C.text3, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        <Link href="/sales-portal/dialer" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.accent}18, ${C.green}10)`,
            border: `1px solid ${C.accent}30`,
            borderRadius: 14, padding: '16px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Phone size={22} color={C.accent} strokeWidth={1.8} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>Power Dialer</div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 1 }}>Start calling</div>
            </div>
          </div>
        </Link>
        <Link href="/sales-portal/leads" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.green}18, ${C.cyan}10)`,
            border: `1px solid ${C.green}30`,
            borderRadius: 14, padding: '16px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Plus size={22} color={C.green} strokeWidth={1.8} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>Upload List</div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 1 }}>Import contacts</div>
            </div>
          </div>
        </Link>
      </div>

      {/* AI Coaching Alert */}
      {stats.unreviewed > 0 && (
        <Link href="/sales-portal/coaching" style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 20 }}>
          <div style={{
            background: `${C.purple}10`, border: `1px solid ${C.purple}25`,
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <Brain size={22} color={C.purple} strokeWidth={1.6} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>
                {stats.unreviewed} call{stats.unreviewed > 1 ? 's' : ''} to review
              </div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 1 }}>
                AI analyzed your recent calls — review feedback
              </div>
            </div>
            <ChevronRight size={18} color={C.purple} />
          </div>
        </Link>
      )}

      {/* Today's Tasks */}
      {pendingTasks.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Today&apos;s Tasks ({pendingTasks.length})
            </h2>
            <Link href="/sales-portal/tasks" style={{ fontSize: 11, color: C.accent, textDecoration: 'none', fontWeight: 600 }}>
              View All
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendingTasks.slice(0, 5).map(t => {
              const meta = TASK_TYPE_ICON[t.type] ?? TASK_TYPE_ICON.custom
              return (
                <div key={t.id} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <meta.Icon size={16} color={meta.color} strokeWidth={1.6} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{t.title}</div>
                    {t.description && (
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                  {t.priority === 'urgent' && <AlertCircle size={14} color={C.red} />}
                  {t.priority === 'high' && <AlertCircle size={14} color={C.amber} />}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Upcoming Callbacks */}
      {callbackLeads.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
            Upcoming Callbacks
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {callbackLeads.slice(0, 5).map(l => (
              <div key={l.id} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Clock size={16} color={C.amber} strokeWidth={1.6} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{l.name}</div>
                  {l.company && <div style={{ fontSize: 11, color: C.text3 }}>{l.company}</div>}
                </div>
                <div style={{ fontSize: 11, color: C.amber, fontFamily: 'JetBrains Mono, monospace' }}>
                  {l.next_callback ? new Date(l.next_callback).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Lead Lists */}
      {lists.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Active Lists
            </h2>
            <Link href="/sales-portal/leads" style={{ fontSize: 11, color: C.accent, textDecoration: 'none', fontWeight: 600 }}>
              Manage
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lists.map(l => {
              const pct = l.total_count > 0 ? Math.round((l.called_count / l.total_count) * 100) : 0
              return (
                <Link key={l.id} href={`/sales-portal/leads/${l.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <Users size={16} color={C.cyan} strokeWidth={1.6} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                        {l.called_count}/{l.total_count} called
                      </div>
                    </div>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: `conic-gradient(${C.green} ${pct * 3.6}deg, ${C.border} ${pct * 3.6}deg)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: C.surface,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: C.text2,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        {pct}%
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Active Referrals */}
      {activeReferrals.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Active Jobs
            </h2>
            <Link href="/sales-portal/referrals" style={{ fontSize: 11, color: C.accent, textDecoration: 'none', fontWeight: 600 }}>
              View All
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeReferrals.slice(0, 4).map(r => {
              const meta = STATUS_META[r.status] ?? STATUS_META.submitted
              return (
                <Link key={r.id} href={`/sales-portal/referrals/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: meta.color, flexShrink: 0,
                      boxShadow: `0 0 6px ${meta.color}60`,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>
                        {r.customer_name || 'Unnamed'}
                      </div>
                      {r.vehicle_desc && (
                        <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{r.vehicle_desc}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                      {r.commission_amount && (
                        <div style={{ fontSize: 10, color: C.text3, marginTop: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                          {money(r.commission_amount)}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {lists.length === 0 && referrals.length === 0 && pendingTasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: C.text3 }}>
          <Users size={40} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16, color: C.text2, marginBottom: 8, fontWeight: 600 }}>Welcome to your Sales Portal</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Upload a lead list to get started with cold calling</div>
          <Link href="/sales-portal/leads" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 10,
            background: C.accent, color: '#fff',
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            <Plus size={16} /> Upload Your First List
          </Link>
        </div>
      )}
    </div>
  )
}
