import { ORG_ID } from '@/lib/org'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    // Default to the current week (Monday through Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const startDate = body.startDate || weekStart.toISOString().split('T')[0]
    const endDate = body.endDate || weekEnd.toISOString().split('T')[0]

    const admin = getSupabaseAdmin()

    // Fetch active employees
    const { data: employees } = await admin
      .from('profiles')
      .select('id, name, email, role, active')
      .eq('org_id', ORG_ID)
      .eq('active', true)
      .order('name')

    if (!employees || employees.length === 0) {
      return NextResponse.json({ recaps: [], message: 'No active employees found' })
    }

    // Fetch all work summaries for the week
    const { data: weekSummaries } = await admin
      .from('work_summaries')
      .select('*')
      .eq('org_id', ORG_ID)
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date', { ascending: true })

    // Fetch all time_clock_entries for the week to detect issues
    const { data: weekEntries } = await admin
      .from('time_clock_entries')
      .select('*, user:user_id(id, name), job:job_id(id, title)')
      .eq('org_id', ORG_ID)
      .gte('clock_in', `${startDate}T00:00:00`)
      .lte('clock_in', `${endDate}T23:59:59`)
      .order('clock_in', { ascending: true })

    // Fetch time off requests for the week
    const { data: timeOffRequests } = await admin
      .from('time_off_requests')
      .select('*')
      .eq('org_id', ORG_ID)
      .gte('start_date', startDate)
      .lte('end_date', endDate)

    const apiKey = process.env.ANTHROPIC_API_KEY
    const anthropic = apiKey ? new Anthropic({ apiKey }) : null

    const recaps: any[] = []
    const errors: any[] = []

    for (const emp of employees) {
      try {
        // Get this employee's summaries and entries
        const empSummaries = (weekSummaries || []).filter((s: any) => s.user_id === emp.id)
        const empEntries = (weekEntries || []).filter((e: any) => e.user_id === emp.id)
        const empTimeOff = (timeOffRequests || []).filter((r: any) => r.user_id === emp.id)

        // Calculate hours
        const totalMinutes = empEntries.reduce((sum: number, e: any) => sum + (e.duration_minutes || 0), 0)
        const totalHours = totalMinutes / 60
        const regularHours = Math.min(totalHours, 40)
        const overtimeHours = Math.max(0, totalHours - 40)

        // Detect missed clock-outs (entries without clock_out or > 12 hours)
        const missedClockOuts = empEntries.filter((e: any) => {
          if (!e.clock_out) return true
          const diff = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()
          return diff > 12 * 60 * 60 * 1000
        })

        // Detect entries with no notes
        const noNotesEntries = empEntries.filter((e: any) => !e.project_notes || e.project_notes.trim() === '')

        // PTO usage
        const ptoEntries = empEntries.filter((e: any) => e.entry_type === 'pto')
        const ptoHours = ptoEntries.reduce((sum: number, e: any) => sum + ((e.duration_minutes || 0) / 60), 0)

        // Build summary data for AI
        const dailySummaries = empSummaries.map((s: any) =>
          `${s.summary_date}: ${s.ai_summary || s.raw_notes || 'No summary'} (${s.hours_logged || 0}h)`
        ).join('\n')

        const jobBreakdown: Record<string, number> = {}
        for (const e of empEntries) {
          const jobName = e.job?.title || 'Unassigned / Shop Time'
          jobBreakdown[jobName] = (jobBreakdown[jobName] || 0) + ((e.duration_minutes || 0) / 60)
        }
        const jobLines = Object.entries(jobBreakdown)
          .sort(([, a], [, b]) => b - a)
          .map(([name, hrs]) => `- ${name}: ${hrs.toFixed(1)}h`)
          .join('\n')

        let weeklyRecap = ''

        if (anthropic && empEntries.length > 0) {
          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            system: 'You are a professional work log summarizer for a vehicle wrap shop. Generate a weekly performance recap for management. Be concise and highlight key accomplishments, concerns, and patterns.',
            messages: [{
              role: 'user',
              content: `Employee: ${emp.name} (${emp.role})
Week: ${startDate} to ${endDate}
Total Hours: ${totalHours.toFixed(1)} (Regular: ${regularHours.toFixed(1)}, OT: ${overtimeHours.toFixed(1)})
PTO Used: ${ptoHours.toFixed(1)}h
Missed Clock-Outs: ${missedClockOuts.length}
Entries Without Notes: ${noNotesEntries.length} of ${empEntries.length}

Job Breakdown:
${jobLines || 'No jobs tracked'}

Daily Summaries:
${dailySummaries || 'No daily summaries available'}

Generate a weekly performance recap with:
1. Key accomplishments
2. Hours analysis (flag overtime or unusual patterns)
3. Any concerns (missed clock-outs, missing notes)
4. Recommendation for next week`,
            }],
          })

          weeklyRecap = message.content[0].type === 'text' ? message.content[0].text : ''
        } else if (empEntries.length > 0) {
          weeklyRecap = `Worked ${totalHours.toFixed(1)} total hours across ${empEntries.length} entries. ${overtimeHours > 0 ? `Overtime: ${overtimeHours.toFixed(1)}h.` : ''} ${missedClockOuts.length > 0 ? `${missedClockOuts.length} missed clock-out(s).` : ''}`
        } else {
          weeklyRecap = 'No time entries recorded this week.'
        }

        recaps.push({
          userId: emp.id,
          name: emp.name,
          role: emp.role,
          weekStart: startDate,
          weekEnd: endDate,
          totalHours: parseFloat(totalHours.toFixed(1)),
          regularHours: parseFloat(regularHours.toFixed(1)),
          overtimeHours: parseFloat(overtimeHours.toFixed(1)),
          ptoHours: parseFloat(ptoHours.toFixed(1)),
          entryCount: empEntries.length,
          missedClockOuts: missedClockOuts.length,
          noNotesEntries: noNotesEntries.length,
          jobBreakdown,
          weeklyRecap,
          flags: {
            hasOvertime: overtimeHours > 0,
            hasMissedClockOuts: missedClockOuts.length > 0,
            hasNoNotesEntries: noNotesEntries.length > 0,
            hasPTO: ptoHours > 0,
            approachingOT: totalHours >= 35 && totalHours < 40,
          },
        })
      } catch (err: any) {
        errors.push({ userId: emp.id, name: emp.name, error: err.message })
      }
    }

    return NextResponse.json({
      weekStart: startDate,
      weekEnd: endDate,
      employeesProcessed: employees.length,
      recaps,
      errors,
    })
  } catch (err: any) {
    console.error('[ai/weekly-recap] error:', err)
    return NextResponse.json({ error: err.message || 'Weekly recap generation failed' }, { status: 500 })
  }
}
