import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

const VINYL_SYSTEM_PROMPT = `You are V.I.N.Y.L. — the AI chief of staff for USA Wrap Co. You have access to all business activity from the last 24 hours. Your job is to brief the owner on: (1) anything urgent that needs immediate attention, (2) any promises or commitments made to customers that haven't been followed up on, (3) missed calls or unanswered messages, (4) jobs at risk of missing deadlines, (5) anything the owner absolutely must know. Be direct, concise, and prioritize by urgency. Format your response as a structured brief with clear sections. Flag anything critical in ALL CAPS.

You must return a valid JSON object with this exact structure:
{
  "sections": [
    {"title": "Section title", "level": "critical|warning|info", "items": ["item 1", "item 2"]}
  ],
  "action_items": [
    {"id": "a1", "text": "action text", "priority": "high|medium|low"}
  ]
}

Levels: critical = red urgent items, warning = amber follow-ups/risks, info = general awareness.
Keep action items to 3-8 maximum. Be honest — if nothing is urgent, say so.`

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, org_id, name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orgId = profile.org_id || ORG_ID
    const body = await req.json().catch(() => ({}))
    const force = body.force === true

    // Check cache (skip if force refresh)
    if (!force) {
      const { data: cached } = await admin
        .from('ai_recaps')
        .select('*')
        .eq('org_id', orgId)
        .gt('cached_until', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cached) {
        return NextResponse.json({
          id: cached.id,
          sections: cached.sections,
          action_items: cached.action_items,
          recap_text: cached.recap_text,
          generated_at: cached.generated_at,
          cached: true,
        })
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[ai/recap] ANTHROPIC_API_KEY is not set')
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    // Fetch owner training instructions
    const { data: instructions } = await admin
      .from('ai_settings')
      .select('setting_value')
      .eq('org_id', orgId)
      .eq('setting_key', 'vinyl_instruction')
      .order('created_at', { ascending: true })

    const customInstructions = instructions?.map(r => r.setting_value) || []

    // Last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()

    // Fetch data in parallel
    const [
      projectsRes,
      estimatesRes,
      tasksOverdueRes,
      tasksNewRes,
      commentsRes,
      appointmentsRes,
      messagesRes,
      callLogsRes,
    ] = await Promise.all([
      admin.from('projects')
        .select('id, title, status, pipe_stage, updated_at, install_date, revenue, agent:agent_id(name), installer:installer_id(name)')
        .eq('org_id', orgId)
        .gte('updated_at', yesterday)
        .order('updated_at', { ascending: false })
        .limit(50),

      admin.from('estimates')
        .select('id, title, status, total, created_at, customer:customer_id(name)')
        .eq('org_id', orgId)
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false })
        .limit(20),

      admin.from('tasks')
        .select('id, title, due_at, status, assigned_to')
        .eq('org_id', orgId)
        .eq('status', 'open')
        .lt('due_at', now)
        .limit(20),

      admin.from('tasks')
        .select('id, title, due_at, status, created_at')
        .eq('org_id', orgId)
        .gte('created_at', yesterday)
        .limit(20),

      admin.from('job_comments')
        .select('id, message, created_at')
        .gte('created_at', yesterday)
        .limit(30),

      admin.from('appointments')
        .select('id, customer_name, appointment_type, date, time, status, notes')
        .eq('org_id', orgId)
        .gte('date', yesterday.split('T')[0])
        .limit(30),

      admin.from('conversation_messages')
        .select('id, body, direction, created_at, conversation_id')
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false })
        .limit(50),

      admin.from('call_logs')
        .select('id, direction, status, duration_seconds, caller_number, caller_name, created_at, notes, recording_url')
        .eq('org_id', orgId)
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    // Build data summary for Claude
    const data = {
      projects_updated: projectsRes.data || [],
      new_estimates: estimatesRes.data || [],
      overdue_tasks: tasksOverdueRes.data || [],
      new_tasks: tasksNewRes.data || [],
      job_comments: commentsRes.data || [],
      appointments: appointmentsRes.data || [],
      sms_messages: messagesRes.data || [],
      call_logs: callLogsRes.data || [],
    }

    // Summarize for prompt (avoid massive context)
    const prompt = `Current time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST

LAST 24 HOURS — BUSINESS ACTIVITY SUMMARY:

PROJECTS UPDATED (${data.projects_updated.length}):
${JSON.stringify(data.projects_updated.slice(0, 20), null, 2)}

NEW ESTIMATES (${data.new_estimates.length}):
${JSON.stringify(data.new_estimates, null, 2)}

OVERDUE TASKS (${data.overdue_tasks.length}) — THESE SHOULD HAVE BEEN DONE:
${JSON.stringify(data.overdue_tasks, null, 2)}

NEW TASKS CREATED TODAY (${data.new_tasks.length}):
${JSON.stringify(data.new_tasks, null, 2)}

APPOINTMENTS (${data.appointments.length}):
${JSON.stringify(data.appointments, null, 2)}

SMS/MESSAGES RECEIVED (${data.sms_messages.filter((m: any) => m.direction === 'inbound').length} inbound):
${JSON.stringify(data.sms_messages.slice(0, 20), null, 2)}

CALL LOGS (${data.call_logs.length}):
${JSON.stringify(data.call_logs, null, 2)}

JOB COMMENTS (${data.job_comments.length}):
${JSON.stringify(data.job_comments.slice(0, 10), null, 2)}

${customInstructions.length > 0 ? `\nOWNER CUSTOM INSTRUCTIONS (follow these in addition to your normal briefing):\n${customInstructions.map((i, n) => `${n + 1}. ${i}`).join('\n')}` : ''}

Generate a concise owner brief as JSON. Focus on what actually matters. If a data array is empty, skip that section.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: VINYL_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[ai/recap] Anthropic error:', errText)
      return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
    }

    const aiData = await res.json()
    const rawText = aiData.content?.[0]?.text ?? ''

    // Parse JSON from response
    let sections: any[] = []
    let actionItems: any[] = []
    let recapText = rawText

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        sections = parsed.sections || []
        actionItems = (parsed.action_items || []).map((item: any, i: number) => ({
          ...item,
          id: item.id || `a${i + 1}`,
        }))
        recapText = sections.map((s: any) => `${s.title}\n${s.items?.join('\n') || ''}`).join('\n\n')
      }
    } catch {
      // Fallback: put raw text in a single section
      sections = [{ title: 'Daily Brief', level: 'info', items: [rawText] }]
      recapText = rawText
    }

    // Save to DB
    const cachedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const { data: saved } = await admin
      .from('ai_recaps')
      .insert({
        org_id: orgId,
        recap_text: recapText,
        sections,
        action_items: actionItems,
        cached_until: cachedUntil,
      })
      .select()
      .single()

    return NextResponse.json({
      id: saved?.id,
      sections,
      action_items: actionItems,
      recap_text: recapText,
      generated_at: saved?.generated_at || new Date().toISOString(),
      cached: false,
    })
  } catch (err: any) {
    console.error('[ai/recap] error:', err)
    return NextResponse.json({ error: err.message || 'Recap generation failed' }, { status: 500 })
  }
}
