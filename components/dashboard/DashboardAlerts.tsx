'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, AlertTriangle, DollarSign, Wrench, TrendingDown, MessageCircle, CheckCircle, ChevronRight, ArrowRight } from 'lucide-react'
import AlertDrillDown from './AlertDrillDown'

interface AlertsProps {
  orgId: string
}

interface StuckJob {
  id: string
  title: string | null
  pipe_stage: string | null
  updated_at: string
  customer?: { name: string } | null
  agent?: { name: string } | null
}

interface MissingTimeJob {
  id: string
  title: string | null
  status: string
  install_date: string | null
  customer?: { name: string } | null
  installer?: { name: string } | null
}

interface MaintenanceItem {
  id: string
  vehicle_id: string
  item_name: string
  due_date: string | null
  status: string
  vehicle?: { name: string | null; plate: string | null } | null
}

const STAGE_LABELS: Record<string, string> = {
  sales_in: 'Sales Intake', production: 'Production', install: 'Install',
  prod_review: 'QC Review', sales_close: 'Sales Close',
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function AlertCard({
  icon: Icon, title, subtitle, count, severity, onClick, dismissed, onDismiss,
}: {
  icon: React.ComponentType<any>
  title: string
  subtitle?: string
  count?: number
  severity: 'red' | 'amber' | 'blue'
  onClick: () => void
  dismissed?: boolean
  onDismiss?: () => void
}) {
  const colors = { red: 'var(--red)', amber: 'var(--amber)', blue: 'var(--accent)' }
  const c = colors[severity]
  const [hover, setHover] = useState(false)
  if (dismissed) return null
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: hover ? `${c}0d` : 'var(--surface)',
        border: `1px solid ${hover ? c + '40' : 'rgba(255,255,255,0.07)'}`,
        borderLeft: `3px solid ${c}`,
        borderRadius: 12, padding: '14px 16px',
        cursor: 'pointer', transition: 'all 0.2s',
        animation: 'alertPulse 3s ease-in-out infinite',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={e => { e.stopPropagation(); onDismiss() }}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'transparent', border: 'none',
            color: 'var(--text3)', cursor: 'pointer',
            fontSize: 14, lineHeight: 1, padding: 2,
            opacity: hover ? 1 : 0, transition: 'opacity 0.15s',
          }}
          title="Dismiss"
        >
          x
        </button>
      )}
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: `${c}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={c} />
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', lineHeight: 1.2 }}>{title}</span>
          {count !== undefined && (
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 10,
              background: `${c}20`, color: c,
              fontFamily: 'JetBrains Mono, monospace',
            }}>{count}</span>
          )}
        </div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{subtitle}</div>}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingTop: 8 }}>
        <ArrowRight size={14} color={c} />
      </div>
    </div>
  )
}

export default function DashboardAlerts({ orgId }: AlertsProps) {
  const router = useRouter()
  const supabase = createClient()

  // Data state
  const [stuckJobs, setStuckJobs] = useState<StuckJob[]>([])
  const [missingTimeJobs, setMissingTimeJobs] = useState<MissingTimeJob[]>([])
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([])
  const [lastPayrollDate, setLastPayrollDate] = useState<string | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loading, setLoading] = useState(true)

  // Drill-down state
  const [drillDown, setDrillDown] = useState<string | null>(null)

  // Dismissed state (session only)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const dismiss = (key: string) => setDismissed(prev => new Set([...prev, key]))

  // Stage advance state
  const [movingJob, setMovingJob] = useState<string | null>(null)

  const STAGES = ['sales_in', 'production', 'install', 'prod_review', 'sales_close']

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true)
      try {
        const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()

        // Stuck jobs (not done, not updated in 3+ days)
        const { data: stuck } = await supabase
          .from('projects')
          .select('id, title, pipe_stage, updated_at, customer:customer_id(name), agent:agent_id(name)')
          .eq('org_id', orgId)
          .not('pipe_stage', 'in', '(done,sales_close)')
          .not('status', 'eq', 'cancelled')
          .lt('updated_at', threeDaysAgo)
          .order('updated_at', { ascending: true })
          .limit(50)
        setStuckJobs((stuck || []) as unknown as StuckJob[])

        // Missing time entries (installed projects)
        const { data: missing } = await supabase
          .from('projects')
          .select('id, title, status, install_date, customer:customer_id(name), installer:installer_id(name)')
          .eq('org_id', orgId)
          .eq('status', 'installed')
          .limit(30)
        setMissingTimeJobs((missing || []) as unknown as MissingTimeJob[])

        // Maintenance items — graceful: fleet_maintenance may not have org_id
        try {
          const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
          const today = new Date().toISOString().split('T')[0]
          const { data: maint } = await supabase
            .from('fleet_maintenance')
            .select('id, vehicle_id, item_name, due_date, status, vehicle:vehicle_id(name, plate)')
            .or(`status.eq.overdue,and(due_date.lte.${sevenDaysLater},status.neq.completed)`)
            .order('due_date', { ascending: true })
            .limit(20)
          setMaintenanceItems((maint || []) as unknown as MaintenanceItem[])
        } catch {
          setMaintenanceItems([])
        }

        // Last payroll run
        try {
          const { data: payroll } = await supabase
            .from('payroll_runs')
            .select('created_at')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          setLastPayrollDate(payroll?.created_at || null)
        } catch {
          setLastPayrollDate(null)
        }

        // Unread messages — graceful: unread column may not exist
        try {
          const { count } = await supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', orgId)
            .gt('unread_count', 0)
          setUnreadMessages(count || 0)
        } catch {
          setUnreadMessages(0)
        }
      } catch (e) {
        console.error('[DashboardAlerts] load error:', e)
      } finally {
        setLoading(false)
      }
    }
    loadAlerts()
  }, [orgId])

  // Move job to next stage
  async function advanceStage(jobId: string, currentStage: string) {
    const idx = STAGES.indexOf(currentStage)
    if (idx < 0 || idx >= STAGES.length - 1) return
    const nextStage = STAGES[idx + 1]
    setMovingJob(jobId)
    try {
      await supabase.from('projects').update({ pipe_stage: nextStage, updated_at: new Date().toISOString() }).eq('id', jobId)
      setStuckJobs(prev => prev.filter(j => j.id !== jobId))
    } finally {
      setMovingJob(null)
    }
  }

  // Payroll alert logic
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const payrollOverdue = !lastPayrollDate || lastPayrollDate < sevenDaysAgo
  const payrollDueSoon = lastPayrollDate && lastPayrollDate < new Date(Date.now() - 5 * 86400000).toISOString() && !payrollOverdue

  const overdueCount = maintenanceItems.filter(m => m.status === 'overdue' || (m.due_date && m.due_date < new Date().toISOString().split('T')[0])).length
  const totalAlerts = [
    stuckJobs.length > 0,
    missingTimeJobs.length > 0,
    payrollOverdue || payrollDueSoon,
    maintenanceItems.length > 0,
    unreadMessages > 0,
  ].filter(Boolean).length

  const visibleAlerts = totalAlerts - dismissed.size

  if (loading) return null
  if (visibleAlerts <= 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.18)',
        borderRadius: 12, marginBottom: 24,
      }}>
        <CheckCircle size={18} color="var(--green)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>All Clear — no urgent items require your attention</span>
      </div>
    )
  }

  return (
    <>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <AlertTriangle size={16} color="var(--red)" />
        <h3 style={{
          fontSize: 13, fontWeight: 800, color: 'var(--text1)', margin: 0,
          fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          ACTION REQUIRED
        </h3>
        <span style={{
          fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
          background: 'rgba(242,90,90,0.18)', color: 'var(--red)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {visibleAlerts}
        </span>
      </div>

      {/* Alert cards grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 10, marginBottom: 28,
      }}>
        {stuckJobs.length > 0 && !dismissed.has('stuck') && (
          <AlertCard
            icon={Clock}
            title={`${stuckJobs.length} jobs stuck in pipeline`}
            subtitle={`Oldest: ${daysSince(stuckJobs[0].updated_at)}d without activity`}
            count={stuckJobs.length}
            severity="amber"
            onClick={() => setDrillDown('stuck')}
            onDismiss={() => dismiss('stuck')}
          />
        )}

        {missingTimeJobs.length > 0 && !dismissed.has('time') && (
          <AlertCard
            icon={Clock}
            title="Installs missing time entries"
            subtitle="Completed installs with no logged hours"
            count={missingTimeJobs.length}
            severity="amber"
            onClick={() => setDrillDown('time')}
            onDismiss={() => dismiss('time')}
          />
        )}

        {(payrollOverdue || payrollDueSoon) && !dismissed.has('payroll') && (
          <AlertCard
            icon={DollarSign}
            title={payrollOverdue ? 'Payroll not run this week' : 'Payroll due soon'}
            subtitle={lastPayrollDate
              ? `Last run: ${new Date(lastPayrollDate).toLocaleDateString()}`
              : 'No payroll history found'}
            severity={payrollOverdue ? 'red' : 'amber'}
            onClick={() => router.push('/payroll')}
            onDismiss={() => dismiss('payroll')}
          />
        )}

        {maintenanceItems.length > 0 && !dismissed.has('maintenance') && (
          <AlertCard
            icon={Wrench}
            title={`${overdueCount > 0 ? `${overdueCount} overdue + ` : ''}${maintenanceItems.length} vehicles need service`}
            subtitle={maintenanceItems[0] ? `${(maintenanceItems[0].vehicle as any)?.name || 'Vehicle'}: ${maintenanceItems[0].item_name}` : ''}
            count={maintenanceItems.length}
            severity={overdueCount > 0 ? 'red' : 'amber'}
            onClick={() => setDrillDown('maintenance')}
            onDismiss={() => dismiss('maintenance')}
          />
        )}

        {unreadMessages > 0 && !dismissed.has('messages') && (
          <AlertCard
            icon={MessageCircle}
            title={`${unreadMessages} unanswered customer messages`}
            subtitle="Messages awaiting reply"
            count={unreadMessages}
            severity="red"
            onClick={() => router.push('/inbox')}
            onDismiss={() => dismiss('messages')}
          />
        )}
      </div>

      {/* STUCK JOBS DRILL-DOWN */}
      <AlertDrillDown
        open={drillDown === 'stuck'}
        onClose={() => setDrillDown(null)}
        title={`Stuck Jobs — ${stuckJobs.length} items`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stuckJobs.map(job => {
            const days = daysSince(job.updated_at)
            return (
              <div key={job.id} style={{
                background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>
                    {(job.customer as any)?.name || job.title || 'Untitled'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {STAGE_LABELS[job.pipe_stage || ''] || job.pipe_stage}
                    </span>
                    {(job.agent as any)?.name && (
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{(job.agent as any).name}</span>
                    )}
                  </div>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                  color: days > 7 ? 'var(--red)' : 'var(--amber)', minWidth: 32, textAlign: 'right',
                }}>
                  {days}d
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => advanceStage(job.id, job.pipe_stage || 'sales_in')}
                    disabled={movingJob === job.id}
                    style={{
                      padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                      background: 'rgba(34,192,122,0.15)', border: '1px solid rgba(34,192,122,0.3)',
                      color: 'var(--green)', cursor: 'pointer',
                      opacity: movingJob === job.id ? 0.5 : 1,
                    }}
                  >
                    Advance
                  </button>
                  <Link
                    href={`/projects/${job.id}`}
                    style={{
                      padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                      background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.25)',
                      color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center',
                    }}
                  >
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </AlertDrillDown>

      {/* MISSING TIME DRILL-DOWN */}
      <AlertDrillDown
        open={drillDown === 'time'}
        onClose={() => setDrillDown(null)}
        title={`Missing Time Entries — ${missingTimeJobs.length} jobs`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {missingTimeJobs.map(job => (
            <div key={job.id} style={{
              background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>
                  {(job.customer as any)?.name || job.title || 'Untitled'}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {job.install_date && (
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                      Installed: {new Date(job.install_date).toLocaleDateString()}
                    </span>
                  )}
                  {(job.installer as any)?.name && (
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{(job.installer as any).name}</span>
                  )}
                </div>
              </div>
              <Link
                href={`/projects/${job.id}`}
                style={{
                  padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.25)',
                  color: 'var(--accent)', textDecoration: 'none',
                }}
              >
                Log Time
              </Link>
            </div>
          ))}
        </div>
      </AlertDrillDown>

      {/* MAINTENANCE DRILL-DOWN */}
      <AlertDrillDown
        open={drillDown === 'maintenance'}
        onClose={() => setDrillDown(null)}
        title={`Fleet Maintenance — ${maintenanceItems.length} items`}
        footerContent={
          <Link
            href="/fleet-map"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 9,
              background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)',
              color: 'var(--cyan)', textDecoration: 'none', fontSize: 13, fontWeight: 600,
            }}
          >
            Open Fleet Map <ArrowRight size={14} />
          </Link>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {maintenanceItems.map(item => {
            const today = new Date().toISOString().split('T')[0]
            const isOverdue = item.status === 'overdue' || (item.due_date && item.due_date < today) || false
            const statusColor = isOverdue ? 'var(--red)' : item.due_date && item.due_date <= new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0] ? 'var(--amber)' : 'var(--accent)'
            const statusLabel = isOverdue ? 'OVERDUE' : 'DUE SOON'
            return (
              <div key={item.id} style={{
                background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>
                    {(item.vehicle as any)?.name || 'Vehicle'} · {item.item_name}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(item.vehicle as any)?.plate && (
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{(item.vehicle as any).plate}</span>
                    )}
                    {item.due_date && (
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>Due: {new Date(item.due_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                  background: `${statusColor}18`, color: statusColor,
                  letterSpacing: '0.06em', textTransform: 'uppercase' as const, flexShrink: 0,
                }}>
                  {statusLabel}
                </span>
              </div>
            )
          })}
        </div>
      </AlertDrillDown>
    </>
  )
}
