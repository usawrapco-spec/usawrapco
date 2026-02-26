import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

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

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const orgId = profile.org_id || ORG_ID
    const { message, history = [] } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Fetch live business stats for context
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [activeProjectsRes, openEstimatesRes, overdueTasksRes, upcomingInstallsRes] = await Promise.all([
      admin.from('projects')
        .select('id, title, status, pipe_stage, revenue, install_date, customer:customer_id(name)')
        .eq('org_id', orgId)
        .not('status', 'in', '(cancelled,done,closed)')
        .order('updated_at', { ascending: false })
        .limit(30),

      admin.from('estimates')
        .select('id, title, status, total, created_at, customer:customer_id(name)')
        .eq('org_id', orgId)
        .in('status', ['draft', 'sent', 'viewed'])
        .gte('created_at', thirtyDaysAgo)
        .limit(20),

      admin.from('tasks')
        .select('id, title, due_at, status')
        .eq('org_id', orgId)
        .eq('status', 'open')
        .lt('due_at', now.toISOString())
        .limit(10),

      admin.from('appointments')
        .select('id, customer_name, appointment_type, date, time, status')
        .eq('org_id', orgId)
        .gte('date', todayStr)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .limit(10),
    ])

    const statsContext = `
LIVE BUSINESS CONTEXT (as of ${now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST):

Active Jobs (${activeProjectsRes.data?.length || 0}):
${JSON.stringify(activeProjectsRes.data?.slice(0, 15) || [], null, 2)}

Open Estimates (${openEstimatesRes.data?.length || 0}):
${JSON.stringify(openEstimatesRes.data?.slice(0, 10) || [], null, 2)}

Overdue Tasks (${overdueTasksRes.data?.length || 0}):
${JSON.stringify(overdueTasksRes.data || [], null, 2)}

Upcoming Appointments:
${JSON.stringify(upcomingInstallsRes.data || [], null, 2)}

Pipeline stages: sales_in → production → install → prod_review → sales_close → done
Commission: Inbound 4.5% GP, Outbound 7% GP, Pre-Sold 5% flat, GPM target >73%
`

    const systemPrompt = `You are V.I.N.Y.L. — the AI chief of staff and personal assistant for ${profile.name || 'the owner'} at USA Wrap Co, a vehicle wrap shop. You have full visibility into the business.

${statsContext}

You can help with:
- Job/customer status lookups
- Business intelligence and analysis
- Strategic recommendations
- Writing customer messages or follow-ups
- Pricing analysis and GPM calculations
- Scheduling and workflow advice

Be direct, concise, and action-oriented. Address the owner by name when appropriate. If you need data you don't have, say so clearly.`

    const recentHistory = history.slice(-20).filter((m: any) => m.role && m.content)
    const messages = [
      ...recentHistory.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[vinyl-chat] Anthropic error:', errText)
      return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
    }

    const aiData = await res.json()
    const response = aiData.content?.[0]?.text ?? ''

    return NextResponse.json({ response })
  } catch (err: any) {
    console.error('[vinyl-chat] error:', err)
    return NextResponse.json({ error: err.message || 'Chat failed' }, { status: 500 })
  }
}
