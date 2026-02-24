import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const targetDate = body.date || new Date().toISOString().split('T')[0]
    const dayStart = `${targetDate}T00:00:00`
    const dayEnd = `${targetDate}T23:59:59`

    const admin = getSupabaseAdmin()

    // Fetch all time_clock_entries for the target date
    const { data: allEntries, error: entriesErr } = await admin
      .from('time_clock_entries')
      .select('*, user:user_id(id, name, email, role), job:job_id(id, title, vehicle_desc, type, pipe_stage)')
      .eq('org_id', ORG_ID)
      .gte('clock_in', dayStart)
      .lte('clock_in', dayEnd)
      .order('clock_in', { ascending: true })

    if (entriesErr) {
      return NextResponse.json({ error: entriesErr.message }, { status: 500 })
    }

    const entries = allEntries || []

    // Group entries by user
    const byUser = new Map<string, { user: any; entries: any[] }>()
    for (const entry of entries) {
      const userId = entry.user_id
      if (!byUser.has(userId)) {
        byUser.set(userId, { user: entry.user, entries: [] })
      }
      byUser.get(userId)!.entries.push(entry)
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    const anthropic = apiKey ? new Anthropic({ apiKey }) : null

    const summaries: any[] = []
    const errors: any[] = []

    // For each employee with entries, generate a daily summary
    for (const [userId, { user, entries: userEntries }] of byUser) {
      try {
        const totalMinutes = userEntries.reduce((sum: number, e: any) => {
          return sum + (e.duration_minutes || 0)
        }, 0)
        const totalHours = (totalMinutes / 60).toFixed(1)

        // Build entry details for the prompt
        const entryDetails = userEntries.map((e: any) => {
          const clockIn = new Date(e.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          const clockOut = e.clock_out
            ? new Date(e.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : 'STILL CLOCKED IN'
          const dur = e.duration_minutes ? `${Math.floor(e.duration_minutes / 60)}h ${e.duration_minutes % 60}m` : 'N/A'
          const jobName = e.job?.title || 'No job assigned'
          const vehicle = e.job?.vehicle_desc || ''
          const notes = e.project_notes || 'No notes'
          return `- ${clockIn} to ${clockOut} (${dur}) | ${e.entry_type} | Job: ${jobName} ${vehicle ? `(${vehicle})` : ''} | Notes: ${notes}`
        }).join('\n')

        let aiSummary = ''

        if (anthropic) {
          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            system: 'You are a professional work log summarizer for a vehicle wrap shop. Generate a concise daily summary for management review. Include key accomplishments, jobs worked on, and total hours. Keep it to 3-6 bullet points.',
            messages: [{
              role: 'user',
              content: `Employee: ${user?.name || 'Unknown'} (${user?.role || 'staff'})\nDate: ${targetDate}\nTotal hours: ${totalHours}\n\nTime entries:\n${entryDetails}\n\nGenerate a professional daily work summary.`,
            }],
          })

          aiSummary = message.content[0].type === 'text' ? message.content[0].text : ''
        } else {
          // Fallback: basic summary without AI
          aiSummary = `Worked ${totalHours} hours across ${userEntries.length} time entries.`
        }

        // Collect raw notes
        const rawNotes = userEntries
          .map((e: any) => e.project_notes)
          .filter(Boolean)
          .join('; ')

        // Save to work_summaries table
        const { data: savedSummary, error: saveErr } = await admin
          .from('work_summaries')
          .insert({
            org_id: ORG_ID,
            user_id: userId,
            summary_date: targetDate,
            raw_notes: rawNotes || null,
            ai_summary: aiSummary,
            hours_logged: parseFloat(totalHours),
            tasks_completed: userEntries.map((e: any) => ({
              job_id: e.job_id,
              job_title: e.job?.title || null,
              entry_type: e.entry_type,
              duration_minutes: e.duration_minutes,
              notes: e.project_notes,
            })),
          })
          .select()
          .single()

        if (saveErr) {
          errors.push({ userId, name: user?.name, error: saveErr.message })
        } else {
          summaries.push({
            userId,
            name: user?.name || 'Unknown',
            role: user?.role || 'staff',
            date: targetDate,
            totalHours: parseFloat(totalHours),
            entryCount: userEntries.length,
            summary: aiSummary,
            summaryId: savedSummary?.id,
          })
        }
      } catch (err: any) {
        errors.push({ userId, name: user?.name, error: err.message })
      }
    }

    return NextResponse.json({
      date: targetDate,
      employeesProcessed: byUser.size,
      summaries,
      errors,
    })
  } catch (err: any) {
    console.error('[ai/daily-recap] error:', err)
    return NextResponse.json({ error: err.message || 'Daily recap generation failed' }, { status: 500 })
  }
}
