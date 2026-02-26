import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
    const { orgId, profileId } = await req.json()

    if (!orgId || !profileId) {
      return NextResponse.json({ error: 'Missing orgId or profileId' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Get today's date boundaries
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Fetch today's jobs
    const { data: todaysJobs } = await admin
      .from('projects')
      .select('id, title, vehicle_desc, pipe_stage, status, install_date, agent:agent_id(name), installer:installer_id(name)')
      .eq('org_id', orgId)
      .gte('install_date', today.toISOString())
      .lt('install_date', tomorrow.toISOString())
      .limit(20)

    // Fetch overdue tasks
    const { data: overdueTasks } = await admin
      .from('tasks')
      .select('id, title, due_at, project:project_id(title)')
      .eq('org_id', orgId)
      .eq('status', 'open')
      .lt('due_at', new Date().toISOString())
      .limit(10)

    // Fetch pending estimates (>3 days old, no response)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const { data: pendingEstimates } = await admin
      .from('estimates')
      .select('id, title, status, created_at, customer:customer_id(name)')
      .eq('org_id', orgId)
      .eq('status', 'sent')
      .lt('created_at', threeDaysAgo.toISOString())
      .limit(10)

    // Fetch active installer bids
    const { data: activeBids } = await admin
      .from('installer_bids')
      .select('id, status, project:project_id(title)')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .limit(10)

    // Build context for Claude
    const context = {
      todaysJobs: todaysJobs || [],
      overdueTasks: overdueTasks || [],
      pendingEstimates: pendingEstimates || [],
      activeBids: activeBids || [],
    }

    // Generate AI summary using Claude
    const prompt = `You are an AI assistant for USA Wrap Co, a vehicle wrap shop. Generate a concise morning briefing (3-5 bullet points) based on today's schedule and priorities.

Today's Context:
- Jobs scheduled for install today: ${context.todaysJobs.length}
- Overdue tasks: ${context.overdueTasks.length}
- Pending estimates (>3 days old, no response): ${context.pendingEstimates.length}
- Active installer bids awaiting response: ${context.activeBids.length}

Details:
${JSON.stringify(context, null, 2)}

Generate 3-5 actionable bullet points highlighting:
1. Today's installs (if any)
2. Urgent overdue items
3. Follow-up opportunities (old estimates)
4. Any other priorities

Keep each bullet concise (1-2 sentences). Focus on what needs attention today. If there's nothing urgent, say so positively.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250219',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse bullet points (split by lines starting with - or •)
    const bullets = responseText
      .split('\n')
      .filter(line => line.trim().match(/^[-•*]\s/))
      .map(line => line.trim().replace(/^[-•*]\s/, ''))

    return NextResponse.json({
      summary: bullets.length > 0 ? bullets : [responseText],
      context,
    })

  } catch (error: any) {
    console.error('Daily briefing error:', error)
    return NextResponse.json(
      { error: 'Failed to generate briefing', details: error?.message },
      { status: 500 }
    )
  }
}
