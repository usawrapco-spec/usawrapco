export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export interface SystemAlert {
  id: string
  type: 'overdue_invoice' | 'stuck_job' | 'missing_time' | 'payroll_overdue'
  severity: 'red' | 'yellow' | 'orange'
  message: string
  href: string
  count?: number
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ alerts: [], count: 0 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
  const orgId = profile?.org_id || ORG_ID

  const alerts: SystemAlert[] = []

  // ── 1. Overdue invoices (past due date, not paid/void/draft) ──────────
  try {
    const now = new Date().toISOString()
    const { data: overdueInvoices, count } = await admin
      .from('invoices')
      .select('id, invoice_number, due_date, balance_due, customer_id', { count: 'exact' })
      .eq('org_id', orgId)
      .lt('due_date', now)
      .not('status', 'in', '("paid","void","draft")')
      .gt('balance_due', 0)
      .order('due_date', { ascending: true })
      .limit(10)

    if (count && count > 0) {
      const totalBalance = (overdueInvoices || []).reduce((sum: number, inv: any) => sum + (inv.balance_due || 0), 0)
      alerts.push({
        id: 'overdue-invoices',
        type: 'overdue_invoice',
        severity: 'red',
        message: `${count} overdue invoice${count > 1 ? 's' : ''} — $${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} past due`,
        href: '/invoices?status=overdue',
        count,
      })
    }
  } catch {
    // invoices table may not exist yet
  }

  // ── 2. Jobs stuck in a stage > 3 days ─────────────────────────────────
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: stuckJobs, count } = await admin
      .from('projects')
      .select('id, title, pipe_stage, updated_at', { count: 'exact' })
      .eq('org_id', orgId)
      .eq('status', 'active')
      .not('pipe_stage', 'eq', 'done')
      .lt('updated_at', threeDaysAgo)
      .order('updated_at', { ascending: true })
      .limit(10)

    if (count && count > 0) {
      alerts.push({
        id: 'stuck-jobs',
        type: 'stuck_job',
        severity: 'yellow',
        message: `${count} job${count > 1 ? 's' : ''} stuck in pipeline for 3+ days`,
        href: '/pipeline?filter=stuck',
        count,
      })
    }
  } catch {
    // projects table issue
  }

  // ── 3. Missing time entries for completed install jobs ─────────────────
  try {
    // Find projects that have moved past install stage but have no install_sessions
    const { data: completedInstalls } = await admin
      .from('projects')
      .select('id, title')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .in('pipe_stage', ['prod_review', 'sales_close', 'done'])
      .limit(100)

    if (completedInstalls && completedInstalls.length > 0) {
      const projectIds = completedInstalls.map((p: any) => p.id)
      const { data: sessions } = await admin
        .from('install_sessions')
        .select('project_id')
        .in('project_id', projectIds)

      const projectsWithSessions = new Set((sessions || []).map((s: any) => s.project_id))
      const missing = completedInstalls.filter((p: any) => !projectsWithSessions.has(p.id))

      if (missing.length > 0) {
        alerts.push({
          id: 'missing-time',
          type: 'missing_time',
          severity: 'orange',
          message: `${missing.length} completed install${missing.length > 1 ? 's' : ''} missing time entries`,
          href: '/jobs?filter=missing-time',
          count: missing.length,
        })
      }
    }
  } catch {
    // install_sessions table may not exist
  }

  // ── 4. Payroll not run this week (if past Thursday) ───────────────────
  try {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sun, 4=Thu
    if (dayOfWeek >= 4 || dayOfWeek === 0) {
      // It's Thursday or later — check if payroll was run this week
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)) // Monday of this week
      weekStart.setHours(0, 0, 0, 0)

      const { data: recentRuns } = await admin
        .from('payroll_runs')
        .select('id')
        .eq('org_id', orgId)
        .gte('created_at', weekStart.toISOString())
        .not('status', 'eq', 'cancelled')
        .limit(1)

      if (!recentRuns || recentRuns.length === 0) {
        alerts.push({
          id: 'payroll-overdue',
          type: 'payroll_overdue',
          severity: 'red',
          message: 'Payroll has not been run this week',
          href: '/payroll',
          count: 1,
        })
      }
    }
  } catch {
    // payroll_runs table may not exist
  }

  return Response.json({
    alerts,
    count: alerts.reduce((sum, a) => sum + (a.count || 1), 0),
  })
}
