import { ORG_ID } from '@/lib/org'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    // Verify cron secret for Vercel cron jobs — fail-closed (required in all envs)
    const authHeader = req.headers.get('authorization')
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const today = new Date().toISOString().split('T')[0]
    const alerts: any[] = []

    // 1. Call daily-recap endpoint internally
    let recapResult: any = null
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

      const recapRes = await fetch(`${baseUrl}/api/ai/daily-recap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      })

      recapResult = await recapRes.json()
    } catch (err: any) {
      alerts.push({
        type: 'error',
        title: 'Daily recap generation failed',
        message: err.message,
        severity: 'high',
      })
    }

    // 2. Check for employees who forgot to clock out (active entries > 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    const { data: staleEntries } = await admin
      .from('time_clock_entries')
      .select('*, user:user_id(id, name, email)')
      .eq('org_id', ORG_ID)
      .eq('status', 'active')
      .is('clock_out', null)
      .lte('clock_in', twelveHoursAgo)

    if (staleEntries && staleEntries.length > 0) {
      for (const entry of staleEntries) {
        const clockInTime = new Date(entry.clock_in)
        const hoursElapsed = ((Date.now() - clockInTime.getTime()) / (1000 * 60 * 60)).toFixed(1)

        alerts.push({
          type: 'missed_clock_out',
          title: `${entry.user?.name || 'Unknown'} forgot to clock out`,
          message: `Clocked in ${hoursElapsed} hours ago at ${clockInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. Entry is still active.`,
          severity: 'high',
          userId: entry.user_id,
          entryId: entry.id,
        })
      }
    }

    // 3. Check for entries with 0 notes today
    const { data: noNotesEntries } = await admin
      .from('time_clock_entries')
      .select('*, user:user_id(id, name)')
      .eq('org_id', ORG_ID)
      .gte('clock_in', `${today}T00:00:00`)
      .lte('clock_in', `${today}T23:59:59`)
      .or('project_notes.is.null,project_notes.eq.')

    if (noNotesEntries && noNotesEntries.length > 0) {
      // Group by user
      const noNotesByUser = new Map<string, number>()
      for (const entry of noNotesEntries) {
        const name = entry.user?.name || 'Unknown'
        noNotesByUser.set(name, (noNotesByUser.get(name) || 0) + 1)
      }

      for (const [name, count] of noNotesByUser) {
        alerts.push({
          type: 'missing_notes',
          title: `${name} has ${count} time entries without notes`,
          message: `${count} time entries logged today without project notes. Encourage employees to add work descriptions.`,
          severity: 'low',
        })
      }
    }

    // 4. Check for overtime approaching (employees nearing 40 hours this week)
    const dayOfWeek = new Date().getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() + mondayOffset)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const { data: weekEntries } = await admin
      .from('time_clock_entries')
      .select('user_id, duration_minutes, user:user_id(id, name)')
      .eq('org_id', ORG_ID)
      .gte('clock_in', `${weekStartStr}T00:00:00`)
      .not('duration_minutes', 'is', null)

    if (weekEntries && weekEntries.length > 0) {
      const hoursByUser = new Map<string, { name: string; hours: number }>()
      for (const entry of weekEntries) {
        const userId = entry.user_id
        if (!hoursByUser.has(userId)) {
          hoursByUser.set(userId, { name: (entry.user as any)?.name || 'Unknown', hours: 0 })
        }
        hoursByUser.get(userId)!.hours += (entry.duration_minutes || 0) / 60
      }

      for (const [userId, { name, hours }] of hoursByUser) {
        if (hours >= 38 && hours < 40) {
          alerts.push({
            type: 'ot_approaching',
            title: `${name} is approaching overtime`,
            message: `${hours.toFixed(1)} hours logged this week. Overtime threshold at 40 hours.`,
            severity: 'medium',
            userId,
          })
        } else if (hours >= 40) {
          alerts.push({
            type: 'overtime',
            title: `${name} is in overtime`,
            message: `${hours.toFixed(1)} hours logged this week. ${(hours - 40).toFixed(1)} hours of overtime.`,
            severity: 'high',
            userId,
          })
        }
      }
    }

    // 5. Store alerts as notifications
    if (alerts.length > 0) {
      const notifications = alerts.map((alert) => ({
        org_id: ORG_ID,
        type: 'system',
        title: alert.title,
        message: alert.message,
        read: false,
      }))

      await admin.from('notifications').insert(notifications)
    }

    return NextResponse.json({
      ok: true,
      date: today,
      recapResult: recapResult ? {
        employeesProcessed: recapResult.employeesProcessed,
        summaryCount: recapResult.summaries?.length || 0,
        errorCount: recapResult.errors?.length || 0,
      } : null,
      alertCount: alerts.length,
      alerts,
    })
  } catch (err: any) {
    console.error('[cron/nightly-recap] error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
